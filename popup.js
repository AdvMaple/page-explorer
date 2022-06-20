let activeSection, activeSidebarItem
let isDarkMode = false
const paWindowIdentifier = 'pageExplorer_xSfAvdsmKLSMKDsV'

function toggleDarkMode() {
    isDarkMode = !isDarkMode
    document.body.classList.toggle('dark-mode')
}

function setPopupLoadingState(isLoading) {
    if(isLoading) {
        document.getElementById('loading-page-text').innerHTML = 'Loading...'
        document.body.querySelector('main').style.display = 'none'
        document.getElementById('loading-page-text').style.display = 'grid'
    } else {
        document.body.querySelector('main').style.display = 'grid'
        document.getElementById('loading-page-text').style.display = 'none'
    }
}

async function reloadPopup() {
    setPopupLoadingState(true)

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        
    if(!canExecuteScript(tab)) return document.getElementById('loading-page-text').innerHTML = 'Cannot access a "chrome://" url.'

    injectAndExecutePageExplorer(tab)
}

function injectAndExecutePageExplorer(tab) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['PageExplorer.js'],
    }, () => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: explorePage,
        }, result)
    })
}

function canExecuteScript(tab) {
    return !tab.url.includes('chrome://') && !tab.url.includes('chrome-extension://')
}

function explorePage() {
    const explorer = new PageExplorer()
    return explorer.analyze()
}

function result(resultTab) {
    if (!resultTab) return
    const result = resultTab[0].result
    if (!result) return

    generateSidebar(result)
    generateSections(result)

    // set active section
    setActiveSectionBySidebarElement(document.getElementById('sidebar-item-home'))

    // insert elements
    const dataKeys = Object.keys(result)
    for (let i = 0; i < dataKeys.length; i++) {
        const identifier = dataKeys[i]
        const section = document.getElementById(`section-${identifier}`)
        section.innerHTML = ''
        for (let j = 0; j < result[identifier].length; j++) {
            const data = result[identifier][j]
            const sectionElement = document.createElement('div')
            sectionElement.classList.add('section-element')

            // default copy attribute, if you need another copy just overwrite below
            sectionElement.setAttribute('data-copy', data)

            // default event listener, will copy data. Again overwrite below if necessary
            sectionElement.addEventListener('click', (e) => {
                copyToClp(e.target.getAttribute('data-copy'))
            })

            // custom for each identifier

            // Image
            if (identifier === 'imageUrls') {
                sectionElement.style.cssText = 'background-repeat: no-repeat;background-position: center center;background-size:cover;'
                sectionElement.style.backgroundImage = `url(${getUrl(data)})`
                sectionElement.setAttribute('data-copy', getUrl(data))
            }
            // Svg
            else if (identifier === 'svgs') {
                sectionElement.removeAttribute('data-copy')
                sectionElement.addEventListener('click', (e) => {
                    copyToClp(e.target.outerHTML)
                })

                sectionElement.innerHTML = data
            }
            // Color
            else if (identifier === 'colors') {
                sectionElement.style.backgroundColor = data.color
                sectionElement.setAttribute('data-copy', data.color)
            }
            // Html Tags
            else if (identifier === 'htmlTags') {
                sectionElement.innerHTML = `
                    <p style="font-weight: bold;">${data.tagName.toLowerCase()}</p>
                    <p>${data.counter}</p>
                `
                sectionElement.setAttribute('data-copy', data.tagName.toLowerCase())
                sectionElement.style.padding = '8px'
                sectionElement.style.textAlign = 'center'
            }
            // Box Shadow
            else if (identifier === 'boxShadows') {
                const boxShadowEl = document.createElement('div')
                boxShadowEl.style.boxShadow = data
                boxShadowEl.style.height = '60px'
                boxShadowEl.style.width = '60px'
                boxShadowEl.style.pointerEvents = 'none'
                sectionElement.appendChild(boxShadowEl)
            }
            // classes
            else if (identifier === 'classes') {
                const count = document.createElement('div')
                count.style.position = 'absolute'
                count.style.top = '8px'
                count.style.right = '8px'
                count.innerHTML = `// count: ${data.counter}`

                const pre = document.createElement('pre')
                if (data.attributes.length === 0) {
                    pre.innerHTML = `<b>.${data.className}</b> { }`
                } else {
                    pre.innerHTML = `<b>.${data.className}</b> {\n    ${data.attributes.map(attribute => `${attribute.attr}: ${attribute.value};\n`).join('    ')}}`
                }
                pre.style.pointerEvents = 'none'
                count.style.pointerEvents = 'none'

                sectionElement.classList.add('pre-code')
                sectionElement.removeAttribute('data-copy')
                sectionElement.addEventListener('click', (e) => {
                    copyToClp(e.target.querySelector('pre').innerHTML.replace('<b>', '').replace('</b>', ''))
                })

                sectionElement.style.height = 'unset'
                sectionElement.style.placeItems = 'unset'
                sectionElement.style.padding = '8px'
                sectionElement.style.position = 'relative'

                sectionElement.appendChild(pre)
                sectionElement.appendChild(count)
            }
            // Default Element
            else {
                sectionElement.innerText = data
                sectionElement.style.padding = '8px'
            }

            section.appendChild(sectionElement)
        }
    }

    // add counters to sidebar
    const sidebarItems = document.querySelector('.sidebar').children
    for (let i = 0; i < sidebarItems.length; i++) {
        const el = sidebarItems[i]
        const dataIdentifier = el.id.replace('sidebar-item-', '').replace(/-./g, (val) => {
            return val.charAt(1).toUpperCase()
        })
        if(['home'].includes(dataIdentifier)) continue
        if (result[dataIdentifier]) el.querySelector('.sidebar-item--counter').innerHTML = result[dataIdentifier].length
    }

    // home
    document.getElementById('section-home').innerHTML = `
        <div class="section-home-row">
            ${result.home.icon ? `<img class="home-page-icon" src="${result.home.icon}">` : '<object data="assets/help.svg"></object>'}
        </div>
        <div class="section-home-row section-home-row--host">
            <div class="home-page-host">${result.home.host}</div>
        </div>
        <div class="section-home-row section-home-row--path">
            <div class="home-page-path">${result.home.path}</div>
        </div>
        <div class="section-home-row section-home-row--info">
            <div class="home-page-document-size">Document Size: ${result.home.htmlDocumentSize.toFixed(2)} ${result.home.htmlDocumentSizeUnit}</div>
        </div>
    `

    console.log(result)
    setPopupLoadingState(false)
}

function generateSidebar(data) {
    const sidebarWrapper = document.body.querySelector('.sidebar')
    sidebarWrapper.innerHTML = ''

    const dataKeys = Object.keys(data)
    for (let i = 0; i < dataKeys.length; i++) {
        const identifier = dataKeys[i]
        const sidebarElement = document.createElement('div')
        sidebarElement.classList.add('sidebar-item')
        sidebarElement.id = `sidebar-item-${identifier}`
        sidebarElement.innerHTML = `
                <object data="assets/${identifier}.svg"></object>
                <div class="sidebar-item--counter"></div>
        `
        sidebarElement.addEventListener('click', (e) => {
            setActiveSectionBySidebarElement(e.target)
        })

        sidebarWrapper.appendChild(sidebarElement)
    }

    // add custom items, like reload or dark mode switch
    const darkModeEl = document.createElement('div')
    darkModeEl.classList.add('sidebar-item')
    darkModeEl.innerHTML = `
        <object data="assets/brightness-6.svg"></object>
    `
    darkModeEl.addEventListener('click', () => {
        toggleDarkMode()
    })
    darkModeEl.style.marginTop = 'auto'

    const reloadEl = document.createElement('div')
    reloadEl.classList.add('sidebar-item')
    reloadEl.innerHTML = `
        <object data="assets/reload.svg"></object>
    `
    reloadEl.addEventListener('click', async () => {
        await reloadPopup()
    })

    sidebarWrapper.appendChild(darkModeEl)
    sidebarWrapper.appendChild(reloadEl)
}

function setActiveSectionBySidebarElement(el) {
    // change sidebar active element
    if (activeSidebarItem) activeSidebarItem.classList.remove('sidebar-item--active')
    activeSidebarItem = el
    activeSidebarItem.classList.add('sidebar-item--active')

    // change display of section
    if (activeSection) activeSection.style.top = '-9999999999px'
    activeSection = document.getElementById(`section-${el.id.replace('sidebar-item-', '')}`)
    activeSection.style.top = '0'
}

function generateSections(data) {
    const sectionWrapper = document.body.querySelector('main')
    sectionWrapper.innerHTML = ''
    const dataKeys = Object.keys(data)
    for (let i = 0; i < dataKeys.length; i++) {
        const identifier = dataKeys[i]
        const sectionElement = document.createElement('section')
        sectionElement.id = `section-${identifier}`

        // adjust sections if needed
        if (identifier === 'classes') {
            sectionElement.style.gridTemplateColumns = '1fr'
        }
        else if (identifier === 'home') {
            sectionElement.style.placeItems = 'center'
            sectionElement.style.height = '100%'
            sectionElement.style.display = 'flex'
            sectionElement.style.flexDirection = 'column'  
            sectionElement.style.alignItems = 'center'  
            sectionElement.style.justifyContent = 'center'  
        }

        sectionWrapper.appendChild(sectionElement)
    }

    // custom sections
}

// thank you https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript/51126086#51126086
function copyToClp(txt) {
    var m = document
    txt = m.createTextNode(txt)
    var w = window
    var b = m.body
    b.appendChild(txt)
    if (b.createTextRange) {
        var d = b.createTextRange()
        d.moveToElementText(txt)
        d.select()
        m.execCommand('copy')
    }
    else {
        var d = m.createRange()
        var g = w.getSelection
        d.selectNodeContents(txt)
        g().removeAllRanges()
        g().addRange(d)
        m.execCommand('copy')
        g().removeAllRanges()
    }
    txt.remove()

    const alert = document.createElement('div')
    alert.classList.add('alert')
    alert.innerHTML = 'Copied!'
    document.body.appendChild(alert)
    setTimeout(() => {
        alert.remove()
    }, 1500)
}

function getUrl(url) {
    const match = url.match(/(?<=url\(\")(.*)(?=\"\))/)
    if (match) return match[0]
    return url
}

reloadPopup()

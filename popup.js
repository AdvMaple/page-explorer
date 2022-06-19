let activeSection, activeSidebarItem
let isDarkMode = false
const paWindowIdentifier = 'pageExplorer_xSfAvdsmKLSMKDsV'

function toggleDarkMode() {
    isDarkMode = !isDarkMode
    document.body.classList.toggle('dark-mode')
}

async function reloadPopup() {
    document.body.querySelector('main').style.display = 'none'
    document.getElementById('loading-page-text').style.display = 'grid'
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if(tab.url.includes('chrome://') || tab.url.includes('chrome-extension://')) {
        document.getElementById('loading-page-text').innerHTML = 'Cannot access a "chrome://" url.'
    } else {
        document.getElementById('loading-page-text').innerHTML = 'Loading...'
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: run,
        }, result)
    }
}

function run() {
    // explorer class
    class Explorer {
        data = {}

        analyze() {
            console.log('starting analyze...')
            const start = performance.now()
            this._resetData()

            const elements = document.getElementsByTagName('*')
            for (let i = 0; i < elements.length; i++) {
                // get class specific styles
                const element = elements[i]
                const style = getComputedStyle(element)

                const attributesLinkGraphic = ['href', 'src', 'backgroundImage', 'borderImage']
                // links and graphics
                for (let j = 0; j < attributesLinkGraphic.length; j++) {
                    const attr = attributesLinkGraphic[j]
                    const elementValue = element[attr]
                    const styleValue = style[attr]
                    this._checkAndAddLink(styleValue)
                    this._checkAndAddLink(elementValue)
                }

                // colors
                const attributesColor = ['color', 'backgroundColor', 'accentColor', 'borderColor']
                for (let j = 0; j < attributesColor.length; j++) {
                    const color = style[attributesColor[j]]
                    this._checkAndAddColor(color)
                }

                // svg
                if (element.tagName === 'svg') {
                    // ignore defs
                    if (!element.outerHTML.includes('<defs>')) {
                        // ignore svg elements with 0 viewBox and duplicates
                        if (!element.getAttribute('viewBox')) element.setAttribute('viewBox', '0 0 24 24')
                        if (!this.data.svgs.includes(element.outerHTML) && element.getAttribute('viewBox') !== '0 0 0 0') this.data.svgs.push(element.outerHTML)
                    }
                }

                //classes
                element.classList.forEach(cls => {
                    if(!this.data.classesTmp[cls]) this.data.classesTmp[cls] = 1
                    else this.data.classesTmp[cls] += 1
                })

                // html tag counters
                this._checkAndAddHtmlTagName(element.tagName)

                // box shadow
                this._checkAndAddBoxShadow(style.boxShadow)

            }

            // insert and analyze classes at once -> better performance 
            this.classFragment = document.createDocumentFragment()
            // add default element to compare
            const elementTag = `element-${new Date().getTime()}`
            this.elementWrapper = document.createElement(elementTag)
            this.defaultElement = document.createElement(elementTag)
            document.body.appendChild(this.elementWrapper)
            this.elementWrapper.appendChild(this.defaultElement)
            this.defaultStyle = getComputedStyle(this.defaultElement)

            Object.keys(this.data.classesTmp).forEach(cls => {
                const classElement = document.createElement(elementTag)
                classElement.classList.add(cls)
                this.classFragment.appendChild(classElement)
            })

            // add fragment to body
            this.elementWrapper.appendChild(this.classFragment)
            Object.keys(this.data.classesTmp).forEach(cls => {
                if (cls.includes('=') || cls.includes(':')) return
                this.data.classes[cls] = {
                    counter: this.data.classesTmp[cls],
                    attributes: this._getClassAttributes(cls)
                }
            })

            this.elementWrapper.remove()
            delete this.data.classesTmp

            // sort colors by counter -> hightest to lowest
            const colorsSortable = []
            for (const color in this.data.colors) {
                colorsSortable.push({ color: color, counter: this.data.colors[color] })
            }
            this.data.colors = this._sortArrayByCounter(colorsSortable)

            // sort colors by counter -> hightest to lowest
            const tagsSortable = []
            for (const tagName in this.data.htmlTags) {
                tagsSortable.push({ tagName: tagName, counter: this.data.htmlTags[tagName] })
            }
            this.data.htmlTags = this._sortArrayByCounter(tagsSortable)

            // sort classes by counter
            const classesSortable = []
            for (const cls in this.data.classes) {
                classesSortable.push({ className: cls, counter: this.data.classes[cls].counter, attributes: this.data.classes[cls].attributes })
            }
            this.data.classes = this._sortArrayByCounter(classesSortable)

            // filter out duplicates
            this.data.imageUrls = [...new Set(this.data.imageUrls)]
            this.data.boxShadows = [...new Set(this.data.boxShadows)]

            console.log(`done. took ${(performance.now() - start) / 1000}s`)

            // add info data
            this.data.home.htmlDocumentSize = new Blob([document.documentElement.outerHTML], {type : 'text/html'}).size / 1024 / 1024
            this.data.home.htmlDocumentSizeUnit = 'MiB'
            this.data.home.host = window.location.host
            this.data.home.path = window.location.pathname
            this.data.home.icon = document.querySelector('head [rel*="icon"]').getAttribute('href')
            
            return this.data
        }

        _getClassAttributes(cls) {
            const classElement = this.elementWrapper.querySelector(`.${cls}`)
            const classStyle = getComputedStyle(classElement)

            let attributes = []

            for (let i = 0; i < classStyle.length; i++) {
                const attr = classStyle[i]
                if (classStyle[attr] !== this.defaultStyle[attr]) {
                    attributes.push({
                        attr,
                        value: classStyle[attr]
                    })
                }
            }

            return attributes
        }

        _checkAndAddLink(val) {
            if (!this._existsValue(val) || typeof (val) !== 'string') return
            if (this._isGraphic(val)) return this.data.imageUrls.push(val)
        }

        _sortArrayByCounter(arr) {
            return arr.sort((a, b) => {
                if (b.counter > a.counter) return 1
                if (a.counter > b.counter) return -1
                return 0
            })
        }

        _checkAndAddHtmlTagName(tagName) {
            if (this.data.htmlTags[tagName]) return this.data.htmlTags[tagName] += 1
            this.data.htmlTags[tagName] = 1
        }

        _checkAndAddColor(val) {
            if (!this._existsValue(val)) return
            if (this.data.colors[val]) return this.data.colors[val] += 1
            this.data.colors[val] = 1
        }

        _checkAndAddBoxShadow(val) {
            if (!this._existsValue(val)) return
            this.data.boxShadows.push(val)
        }

        _resetData() {
            this.data = {
                imageUrls: [],
                colors: {},
                boxShadows: [],
                svgs: [],
                htmlTags: {},
                classes: {},
                classesTmp: [],
                home: {},
            }
        }

        _existsValue(val) {
            return val && val !== 'none'
        }

        _isGraphic(url) {
            if (typeof url !== 'string') return false
            const IMAGE_EXTENSIONS = ['.jpg', '.png', '.svg', '.jpeg', '.apng', '.avif', '.gif', '.jfif', '.pjpeg', '.pjp', '.webp']
            return IMAGE_EXTENSIONS.filter(ext => url.includes(ext)).length > 0 || url.includes('data:image')
        }

        banner() {
            console.log(`%cPage Explorer ${manifestData.version}`, 'font-weight: bold; font-family: "Roboto", sans-serif;')
        }
    }

    const explorer = new Explorer()
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
            <img class="home-page-icon" src="${result.home.icon}">
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
    document.body.querySelector('main').style.display = 'grid'
    document.getElementById('loading-page-text').style.display = 'none'
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

let activeSection, activeSidebarItem
let isDarkMode = false
const paWindowIdentifier = 'pageAnalyzer_xSfAvdsmKLSMKDsV'

function toggleDarkMode() {
    isDarkMode = !isDarkMode
    document.body.classList.toggle('dark-mode')
}

async function reloadPopup() {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: run,
    }, result)
}

function run() {
    // analyzer class
    class Analyzer {
        data = {}
        
        analyze() {
            this._resetData()
    
            const elements = document.getElementsByTagName('*')
            for (let i = 0; i < elements.length; i++) {
                // get class specific styles
                const element = elements[i]
                const style = getComputedStyle(element)
    
                const attributesLinkGraphic = ['href', 'src', 'backgroundImage', 'borderImage']
                // links and graphics
                for(let j = 0; j < attributesLinkGraphic.length; j++) {
                    const attr = attributesLinkGraphic[j]
                    const elementValue  = element[attr]
                    const styleValue = style[attr]
                    this._checkAndAddLink(styleValue)
                    this._checkAndAddLink(elementValue)
                }
    
                // colors
                const attributesColor = ['color', 'backgroundColor', 'accentColor', 'borderColor']
                for(let j = 0; j < attributesColor.length; j++) {
                    const color = style[attributesColor[j]]
                    this._checkAndAddColor(color)
                }

                // svg
                if(element.tagName === 'svg') {
                    // ignore defs
                    if(!element.outerHTML.includes('<defs>')) {
                        // ignore svg elements with 0 viewBox and duplicates
                        if(!this.data.svgs.includes(element.outerHTML) && element.getAttribute('viewBox') !== '0 0 0 0') this.data.svgs.push(element.outerHTML)
                    }
                }

                // html tag counters
                this._checkAndAddHtmlTagName(element.tagName)

                // box shadow
                this._checkAndAddBoxShadow(style.boxShadow)
    
            }
    
            // sort colors by counter -> hightest to lowest
            const colorsSortable = []
            for(const color in this.data.colors) {
                colorsSortable.push({color: color, counter: this.data.colors[color]})
            }
            this.data.colors = this._sortArrayByCounter(colorsSortable)

            // sort colors by counter -> hightest to lowest
            const tagsSortable = []
            for(const tagName in this.data.htmlTags) {
                tagsSortable.push({tagName: tagName, counter: this.data.htmlTags[tagName]})
            }
            this.data.htmlTags = this._sortArrayByCounter(tagsSortable)

            // filter out duplicates
            this.data.imageUrls = [...new Set(this.data.imageUrls)]
            this.data.boxShadows = [...new Set(this.data.boxShadows)]

            return this.data
        }
    
        _checkAndAddLink(val) {
            if(!this._existsValue(val) || typeof(val) !== 'string') return
            if(this._isGraphic(val)) return this.data.imageUrls.push(val)
        }

        _sortArrayByCounter(arr) {
            return arr.sort((a, b) => {
                if(b.counter > a.counter) return 1
                if(a.counter > b.counter) return -1
                return 0
            })
        }

        _checkAndAddHtmlTagName(tagName) {
            if(this.data.htmlTags[tagName]) return this.data.htmlTags[tagName] +=1
            this.data.htmlTags[tagName] = 1
        }
    
        _checkAndAddColor(val) {
            if(!this._existsValue(val)) return
            if(this.data.colors[val]) return this.data.colors[val] += 1
            this.data.colors[val] = 1
        }

        _checkAndAddBoxShadow(val) {
            if(!this._existsValue(val)) return
            this.data.boxShadows.push(val)
        }
    
        _resetData() {
            this.data = {
                imageUrls: [],
                colors: {},
                boxShadows: [],
                svgs: [],
                htmlTags: {},
            }
        }
    
        _existsValue(val) {
            return val && val !== 'none'
        }
    
        _isGraphic(url) {
            if(typeof url !== 'string') return false
            const IMAGE_EXTENSIONS = ['.jpg', '.png', '.svg', '.jpeg', '.apng', '.avif', '.gif', '.jfif', '.pjpeg', '.pjp', '.webp']
            return IMAGE_EXTENSIONS.filter(ext => url.includes(ext)).length > 0 || url.includes('data:image')
        }
    
        banner() {
           console.log(`%cPage Analyzer ${manifestData.version}`, 'font-weight: bold; font-family: "Roboto", sans-serif;')
        }
    }

    const analyzer = new Analyzer()
    return analyzer.analyze()
}

function result(resultTab) {
    if(!resultTab) return
    const result = resultTab[0].result
    if(!result) return

    generateSidebar(result)
    generateSections(result)

    // insert elements
    const dataKeys = Object.keys(result)
    for(let i = 0; i < dataKeys.length; i++) {
        const identifier = dataKeys[i]
        const section = document.getElementById(`section-${identifier}`)
        section.innerHTML = ''
        for(let j = 0; j < result[identifier].length; j++) {
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
            if(identifier === 'imageUrls') {
                sectionElement.style.cssText = 'background-repeat: no-repeat;background-position: center center;background-size:cover;'
                sectionElement.style.backgroundImage = `url(${getUrl(data)})`
                sectionElement.setAttribute('data-copy', getUrl(data))
            }
            // Svg
            else if(identifier === 'svgs') {
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
    for(let i = 0; i < sidebarItems.length; i++) {
        const el = sidebarItems[i]
        const dataIdentifier = el.id.replace('sidebar-item-', '').replace(/-./g, (val) => {
            return val.charAt(1).toUpperCase()
        })
        if(result[dataIdentifier]) el.querySelector('.sidebar-item--counter').innerHTML = result[dataIdentifier].length
    }

    console.log(result)
}

function generateSidebar(data) {
    const sidebarWrapper = document.body.querySelector('.sidebar')
    sidebarWrapper.innerHTML = ''

    const dataKeys = Object.keys(data)
    for(let i = 0; i < dataKeys.length; i++) {
        const identifier = dataKeys[i]
        const sidebarElement = document.createElement('div')
        sidebarElement.classList.add('sidebar-item')
        sidebarElement.id = `sidebar-item-${identifier}`
        sidebarElement.innerHTML = `
                <object data="assets/${identifier}.svg"></object>
                <div class="sidebar-item--counter"></div>
        `
        sidebarElement.addEventListener('click', (e) => {
            setActiveSectionByElement(e.target)
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

function setActiveSectionByElement(el, id) {
    // change sidebar active element
    if(activeSidebarItem) activeSidebarItem.classList.remove('sidebar-item--active')
    activeSidebarItem = el
    activeSidebarItem.classList.add('sidebar-item--active')

    // change display of section
    if(activeSection) activeSection.style.top = '-9999999999px'
    activeSection = document.getElementById(id) || document.getElementById(`section-${el.id.replace('sidebar-item-', '')}`) 
    activeSection.style.top = '0'
}

function generateSections(data) {
    const sectionWrapper = document.body.querySelector('main')
    sectionWrapper.innerHTML = ''
    const dataKeys = Object.keys(data)
    for(let i = 0; i < dataKeys.length; i++) {
        const identifier = dataKeys[i]
        const sectionElement = document.createElement('section')
        sectionElement.id = `section-${identifier}`
        sectionWrapper.appendChild(sectionElement)
    }

    // custom sections
    //welcome section
    const sectionElement = document.createElement('section')
    sectionElement.id = `section-welcome`
    sectionElement.innerHTML = `
        <h1> Welcome to Page Analyzer </h1>
    `
    sectionWrapper.appendChild(sectionElement)
    setActiveSectionByElement(sectionElement, 'section-welcome')
}

// thank you https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript/51126086#51126086
function copyToClp(txt){
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
    if(match) return match[0]
    return url
}

reloadPopup()
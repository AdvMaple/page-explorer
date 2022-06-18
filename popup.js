const sidebarReload = document.getElementById('reload')
const sectionColors = document.getElementById('section-colors')
const sectionImages = document.getElementById('section-image-urls')
const sectionClasses = document.getElementById('section-classes')
const sectionBoxShadows = document.getElementById('section-box-shadows')
const sidebarColors = document.getElementById('sidebar-item-colors')
const sidebarImages = document.getElementById('sidebar-item-image-urls')
const sidebarClasses = document.getElementById('sidebar-item-classes')
const sidebarBoxShadows = document.getElementById('sidebar-item-box-shadows')
let activeSection, activeSidebarItem
const paWindowIdentifier = 'pageAnalyzer_xSfAvdsmKLSMKDsV'
const SECTIONS = {
    COLORS: 0,
    IMAGES: 1,
    CLASSES: 2,
    BOX_SHADOWS: 3,
}

// Event Listeners
sidebarColors.addEventListener('click', () => {
    setVisibleSection(SECTIONS.COLORS)
})
sidebarImages.addEventListener('click', () => {
    setVisibleSection(SECTIONS.IMAGES)
})
sidebarClasses.addEventListener('click', () => {
    setVisibleSection(SECTIONS.CLASSES)
})
sidebarBoxShadows.addEventListener('click', () => {
    setVisibleSection(SECTIONS.BOX_SHADOWS)
})
sidebarReload.addEventListener('click', async () => {
    await reloadPopup()
})

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
                    this._checkAndAddGraphicLink(styleValue)
                    this._checkAndAddGraphicLink(elementValue)
                }
    
                // colors
                const attributesColor = ['color', 'backgroundColor', 'accentColor', 'borderColor']
                for(let j = 0; j < attributesColor.length; j++) {
                    const color = style[attributesColor[j]]
                    this._checkAndAddColor(color)
                }

                // svg
                if(element.tagName === 'svg') {
                    this.data.svgs.push(element.outerHTML)
                }

                // box shadow
                this._checkAndAddBoxShadow(style.boxShadow)
    
            }
    
            // sort colors by counter -> hightest to lowest
            const colorsSortable = []
            for(const color in this.data.colors) {
                colorsSortable.push({color: color, counter: this.data.colors[color]})
            }
            this.data.colors = colorsSortable.sort((a, b) => {
                if(b.counter > a.counter) return 1
                if(a.counter > b.counter) return -1
                return 0
            })

            // filter out duplicates
            this.data.imageUrls = [...new Set(this.data.imageUrls)]
            this.data.links = [...new Set(this.data.links)]
            this.data.boxShadows = [...new Set(this.data.boxShadows)]

            return this.data
        }
    
        _checkAndAddGraphicLink(val) {
            if(!this._existsValue(val)) return
            if(this._isGraphic(val)) return this.data.imageUrls.push(val)
            this.data.links.push(val)
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
                links: [],
                colors: {},
                boxShadows: [],
                svgs: [],
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

    // Image Section
    sectionImages.innerHTML = ''
    for(let i = 0; i < result.imageUrls.length; i++) {
        const imgEl = document.createElement('div')
        imgEl.classList.add('section-element')
        imgEl.innerHTML = `
            <img src="${getUrl(result.imageUrls[i])}">
        `
        imgEl.addEventListener('click', (e) => {
            copyToClp(e.target.src)
        })

        sectionImages.appendChild(imgEl)
    }

    // Color Section
    sectionColors.innerHTML = ''
    for(let i = 0; i < result.colors.length; i++) {
        const colorEl = document.createElement('div')
        colorEl.classList.add('section-element')
        colorEl.style.backgroundColor = result.colors[i].color
        colorEl.addEventListener('click', (e) => {
            copyToClp(e.target.style.backgroundColor)
        })
        
        sectionColors.appendChild(colorEl)
    }

    // Box Shadow Section
    sectionBoxShadows.innerHTML = ''
    for(let i = 0; i < result.boxShadows.length; i++) {
        const boxShadowWrapperEl = document.createElement('div')
        boxShadowWrapperEl.classList.add('section-element')
        boxShadowWrapperEl.style.backgroundColor = 'white'
        boxShadowWrapperEl.addEventListener('click', (e) => {
            copyToClp(e.target.style.boxShadow)
        })

        const boxShadowEl = document.createElement('div')
        boxShadowEl.style.boxShadow = result.boxShadows[i]
        boxShadowEl.style.height = '60px'
        boxShadowEl.style.width = '60px'
        boxShadowWrapperEl.appendChild(boxShadowEl)
        
        sectionBoxShadows.appendChild(boxShadowWrapperEl)
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


function setVisibleSection(section) {
    if(activeSection) activeSection.style.display = 'none'
    if(activeSidebarItem) activeSidebarItem.classList.remove('sidebar-item--active')

    switch(section) {
        case SECTIONS.COLORS:
            activeSection = sectionColors
            activeSidebarItem = sidebarColors
            break
        case SECTIONS.IMAGES:
            activeSection = sectionImages
            activeSidebarItem = sidebarImages
            break
        case SECTIONS.CLASSES:
            activeSection = sectionClasses
            activeSidebarItem = sidebarClasses
            break
        case SECTIONS.BOX_SHADOWS:
            activeSection = sectionBoxShadows
            activeSidebarItem = sidebarBoxShadows
            break
        default:
            break
    }

    activeSection.style.display = 'grid'
    activeSidebarItem.classList.add('sidebar-item--active')
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

setVisibleSection(SECTIONS.COLORS)
reloadPopup()
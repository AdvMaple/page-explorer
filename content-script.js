const manifestData = chrome.runtime.getManifest()
const paWindowIdentifier = 'pageAnalyzer_xSfAvdsmKLSMKDsV'
class Analyzer {
    data = {
        imageUrls: [],
        links: [],
        colors: {},
    }
    
    analyze() {
        this._resetData()

        const elements = document.getElementsByTagName('*')
        for (let i = 0; i < elements.length; i++) {
            // get class specific styles
            const element = elements[i]
            const style = getComputedStyle(element)

            const attributesColor = ['color', 'backgroundColor', 'accentColor', 'borderColor']
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
            for(let j = 0; j < attributesColor.length; j++) {
                const color = style[attributesColor[j]]
                this._checkAndAddColor(color)
            }

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

    _resetData() {
        this.data = {
            imageUrls: [],
            links: [],
            colors: {}
        }
    }

    _existsValue(val) {
        return val && val !== 'none'
    }

    _isGraphic(url) {
        if(typeof url !== 'string') return false
        const IMAGE_EXTENSIONS = ['.jpg', '.png', '.svg', '.jpeg', '.apng', '.avif', '.gif', '.jfif', '.pjpeg', '.pjp', '.webp']
        return IMAGE_EXTENSIONS.filter(ext => url.includes(ext)) .length > 0
    }

    banner() {
       console.log(`%cPage Analyzer ${manifestData.version}`, 'font-weight: bold; font-family: "Roboto", sans-serif;')
    }
}

function init() {
    window[paWindowIdentifier] = new Analyzer()
}

window.addEventListener('load', () => {
   init()
}, false)



const manifestData = chrome.runtime.getManifest()

class Analyzer {
    data = {
        imageUrls: [],
        links: []
    }
    
    analyze() {
        const elements = document.getElementsByTagName('*')
        for (let i = 0; i < elements.length; i++) {
            // get class specific styles
            const element = elements[i]
            const style = getComputedStyle(element)
            const linkAttributes = ['href', 'src', 'backgroundImage', 'borderImage']
            for(let j = 0; j < linkAttributes.length; j++) {
                const attr = linkAttributes[j]
                this._checkAndAddAttrArrays(element, attr)
                this._checkAndAddAttrArrays(style, attr)
            }
        }
    }

    _checkAndAddAttrArrays(obj, attr) {
        if(obj[attr] && obj[attr] !== 'none') {
            if(this._isGraphic(obj[attr])) {
                this.data.imageUrls.push(obj[attr])
            } 
        }
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


function run() {
    const analyzer = new Analyzer()
    analyzer.banner()
    analyzer.analyze()
    console.log(analyzer.data)
}

window.addEventListener('load', () => {
    run()
}, false)


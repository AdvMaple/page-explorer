if (!window['PageExplorer']) {
    window['PageExplorer'] = class PageExplorer {
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
                    if (!this.data.classesTmp[cls]) this.data.classesTmp[cls] = 1
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
                if (cls.includes('.') || cls.includes('+')) return
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
            this.data.home.htmlDocumentSize = new Blob([document.documentElement.outerHTML], { type: 'text/html' }).size / 1024 / 1024
            this.data.home.htmlDocumentSizeUnit = 'MiB'
            this.data.home.host = window.location.host
            this.data.home.path = window.location.pathname
            const favicon = document.querySelector('head [rel*="icon"]')
            this.data.home.icon = favicon ? favicon.getAttribute('href') : ''
            if (!this.data.home.icon.includes('://') && this.data.home.icon) this.data.home.icon = `${window.location.origin}/${this.data.home.icon}`
            this.data.home.faviconUrl = `${window.location.origin}/favicon.ico`

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

}


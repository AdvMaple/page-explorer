const loadButton = document.getElementById('load')
const sectionColors = document.getElementById('section-colors')
const sectionImages = document.getElementById('section-images')
const sectionClasses = document.getElementById('section-classes')
const sidebarColors = document.getElementById('sidebar-item-colors')
const sidebarImages = document.getElementById('sidebar-item-images')
const sidebarClasses = document.getElementById('sidebar-item-classes')
let activeSection = sectionColors
const paWindowIdentifier = 'pageAnalyzer_xSfAvdsmKLSMKDsV'
const SECTIONS = {
    COLORS: 0,
    IMAGES: 1,
    CLASSES: 2
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
loadButton.addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: run,
    }, result)
})

function run() {
    return window[paWindowIdentifier].analyze()
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
            <img src="${result.imageUrls[i]}">
        `
        sectionImages.appendChild(imgEl)
    }

    // Color Section
    sectionColors.innerHTML = ''
    
    console.log(result)
}

function setVisibleSection(section) {
    activeSection.style.display = 'none'
    switch(section) {
        case SECTIONS.COLORS:
            sectionColors.style.display = 'grid'
            activeSection = sectionColors
            break
        case SECTIONS.IMAGES:
            sectionImages.style.display = 'grid'
            activeSection = sectionImages
            break
        case SECTIONS.CLASSES:
            sectionClasses.style.display = 'grid'
            activeSection = sectionClasses
            break
        default:
            break
    }
}

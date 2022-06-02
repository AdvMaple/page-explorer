
const manifestData = chrome.runtime.getManifest()

chrome.devtools.panels.create("Page Analyzer",
    null,
    "panel.html",
    run
)

function run() {
    pageAnalyzerBanner()

    chrome.devtools.inspectedWindow.eval(`(${analyze})()`, (result) => {
        log(result)
    })
}

function analyze() {
    const elements = document.getElementsByTagName('*')
    return 123
}




function pageAnalyzerBanner() {
    chrome.devtools.inspectedWindow.eval(`console.log('%cPage Analyzer ${manifestData.version}', 'font-weight: bold; font-family: "Roboto", sans-serif;')`)
}

function log(str) {
    chrome.devtools.inspectedWindow.eval(`console.log("${str}")`)
}
chrome.devtools.panels.create("Page Analyzer",
    null,
    "panel.html",
    false
)

function log(str) {
    chrome.devtools.inspectedWindow.eval(`console.log("${str}")`)
}



// function getUrl(url) {
//     const match = url.match(/(?<=url\(\")(.*)(?=\"\))/)
//     if(match) return match[0]
//     return url
// }
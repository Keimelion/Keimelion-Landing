;(function () {
  try {
    // Crawlers render with an English navigator.language: redirecting them from / to /en/ makes
    // Google see the French home as a redirect / duplicate of the English one.
    if (/bot|crawl|spider|slurp|lighthouse|google-inspectiontool/i.test(navigator.userAgent)) return
    var stored = localStorage.getItem('keimelion.lang')
    var path = location.pathname
    var isRoot = path === '/' || path === '/en' || path === '/en/'
    if (!isRoot) return
    var current = path.indexOf('/en') === 0 ? 'en' : 'fr'
    if (!stored) {
      var preferred = (navigator.language || 'fr').toLowerCase()
      stored = preferred.indexOf('en') === 0 ? 'en' : 'fr'
    }
    if (stored !== current) {
      location.replace(stored === 'en' ? '/en/' : '/')
    }
  } catch (error) {
    void error
  }
})()

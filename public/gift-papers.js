// Draws a wrapping paper (motif + colour) for every [data-gift] at random, on each visit.
// Motif and colour names come from the base-layout sprite (#k-papers), built from
// src/utils/gift-papers.ts. Within a [data-gift-group], papers are dealt without repeats until
// the deck runs out, and a gift never gets its neighbour's motif or colour; data-gift-avoid lists
// colours that would vanish against the gift's backdrop.
//
// Loaded synchronously in <head> (CSP script-src 'self' forbids inline scripts): it marks <html>
// with .k-papers-pending, which hides the gift groups until the papers are dealt at
// DOMContentLoaded, so the markup's fallback papers never flash. Head scripts persist across
// ClientRouter navigations, so the astro:after-swap listener is the only re-run.
;(function () {
  if (window.__kGiftPapers) return
  window.__kGiftPapers = true
  var root = document.documentElement
  root.classList.add('k-papers-pending')

  function shuffle(list) {
    var copy = list.slice()
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1))
      var tmp = copy[i]
      copy[i] = copy[j]
      copy[j] = tmp
    }
    return copy
  }

  // Takes the first card of the pool not in avoid, reshuffling a fresh deck in when none fits.
  function deal(pool, deck, avoid) {
    for (var attempt = 0; attempt < 2; attempt++) {
      for (var i = 0; i < pool.length; i++) {
        if (avoid.indexOf(pool[i]) === -1) return pool.splice(i, 1)[0]
      }
      Array.prototype.push.apply(pool, shuffle(deck))
    }
    return deck[0]
  }

  function wrapGifts() {
    try {
      var sprite = document.getElementById('k-papers')
      if (!sprite) return
      var motifDeck = []
      sprite.querySelectorAll('pattern[id^="k-paper-"]').forEach(function (pattern) {
        motifDeck.push(pattern.id.slice('k-paper-'.length))
      })
      var colorDeck = (sprite.getAttribute('data-paper-colors') || '').split(' ')

      document.querySelectorAll('[data-gift-group]').forEach(function (group) {
        var motifs = []
        var colors = []
        var lastMotif = null
        var lastColor = null
        group.querySelectorAll('[data-gift]').forEach(function (gift) {
          var avoid = (gift.getAttribute('data-gift-avoid') || '').split(' ')
          var motif = deal(motifs, motifDeck, [lastMotif])
          var color = deal(colors, colorDeck, avoid.concat(lastColor))
          gift.setAttribute('data-paper', motif)
          gift.setAttribute('data-paper-color', color)
          gift.querySelectorAll('.k-paper-motif').forEach(function (rect) {
            rect.setAttribute('fill', 'url(#k-paper-' + motif + ')')
          })
          lastMotif = motif
          lastColor = color
        })
      })
    } catch (error) {
      console.error('[gift-papers] could not deal the wrapping papers', error)
    } finally {
      root.classList.remove('k-papers-pending')
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wrapGifts)
  } else {
    wrapGifts()
  }
  document.addEventListener('astro:after-swap', wrapGifts)
})()

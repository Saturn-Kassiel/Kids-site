# Patch Guide - Songs Module

## Ready files
- songs.js - full replacement
- songs_shimmer.css - add to head after style.css

## core.js change (fix 6)
In App.navigate(), AFTER window.scrollTo(0, 0) add:

    if (id !== 'songs' && typeof Songs !== 'undefined' && Songs.index !== -1) {
        Songs.destroy();
    }

## Posters (fix 2)
Create folder assets/images/songs_posters/ with webp images:
kolybelnaya, mama, slon, ded_moroz, fevral, lev, nedelya, nosorog,
papa, umyvanie, yanvar, zebra, yolochka, rozhdestvo, vesna, enot,
lenivec, mart, shakal, volk

## Summary
1. Video sync - currentTime=0 on play
2. Unique posters - _POSTER_BY_FILE
3. Cached video - onloadeddata + readyState
4. Loading indicator - shimmer CSS
5. SVG play/pause - innerHTML not textContent
6. Stop on leave - Songs.destroy()
7. Race condition - _videoLoadId counter

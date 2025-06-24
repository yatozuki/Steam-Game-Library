document.addEventListener('DOMContentLoaded', function() {
    // Video Player
    document.addEventListener('play', function(e) {
        const videos = document.querySelectorAll('.game-video');
        videos.forEach(video => {
            if (video !== e.target && !video.paused) {
            video.pause();
            }
        });
    }, true);

    // System Requirement Buttons
    const iconButton = document.querySelector('.icon-btn');
    const minContent = decodeURIComponent(iconButton.dataset.min);
    document.getElementById('fallbackContainer').style.display = minContent.length > 0 ? 'none' : 'flex';

    document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.onclick = () => {
            if (!btn.dataset.min && !btn.dataset.rec) document.getElementById('fallback').innerHTML = decodeURIComponent(btn.dataset.fallBack);

            document.getElementById('minReq').innerHTML = decodeURIComponent(btn.dataset.min);
            document.getElementById('minContainer').style.display = decodeURIComponent(btn.dataset.min).length === 0 ? 'none' : 'flex';
            document.getElementById('minReq').style.marginTop = '16px';

            document.getElementById('recReq').innerHTML = decodeURIComponent(btn.dataset.rec);
            document.getElementById('recContainer').style.display = decodeURIComponent(btn.dataset.rec).length === 0 ? 'none' : 'flex';
            document.getElementById('recReq').style.marginTop = '16px';
        }
    })
})


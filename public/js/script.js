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

     // Carousel Items
    const mainCarousel = document.querySelector('.main-carousel');
    const carouselItems = document.querySelectorAll('.carousel-item');

    const prevBtn = document.querySelector('.carousel-btn.L');
    const prevNav = document.querySelector('.carousel-nav.prev');

    const nextBtn = document.querySelector('.carousel-btn.R');
    const nextNav = document.querySelector('.carousel-nav.next')

    const thumbnailStrip = document.querySelector('.thumbnail-strip');
    const thumbnailItems = document.querySelectorAll('.thumbnail-item');

    if (!mainCarousel || !thumbnailStrip) return;

    function initCarousel() {
        let currentIdx = 0;
        let isAnimating = false;
        const itemWidth = carouselItems[0]?.offsetWidth;
        const carouselWidth = mainCarousel.offsetWidth;

        function updateActiveThumbnail(index) {
            thumbnailItems.forEach(thumb => thumb.classList.remove('active'));

            const activeThumb = thumbnailItems[index];
            if(activeThumb) {
                activeThumb.classList.add('active');

                const stripWidth = thumbnailStrip.offsetWidth;
                const thumbLeft = activeThumb.offsetLeft;
                const thumbWidth = activeThumb.offsetWidth;

                thumbnailStrip.scrollLeft = thumbLeft - (stripWidth / 2) + (thumbWidth / 2);
            }
        }

        function updateButtons() {
            if (currentIdx <= 0) {
                prevNav.style.display = 'none';
                prevNav.style.opacity = 0;
                prevBtn.disabled;
            } else {
                prevNav.style.display = 'flex';
                prevNav.style.opacity = 1;
            }
                
            if (currentIdx >= carouselItems.length - 1) {
                nextNav.style.display = 'none';
                nextNav.style.opacity = 0;
                nextBtn.disabled;
            } else {
                nextNav.style.display = 'flex';
                nextNav.style.opacity = 1;
            }
        }

        function goToIndex(newIdx) {
            if (isAnimating || newIdx < 0 || newIdx >= carouselItems.length) return;

            currentIdx = newIdx;
            isAnimating = true;

            updateActiveThumbnail(currentIdx);
            updateButtons();

            const scrollPosition = currentIdx * itemWidth;

            mainCarousel.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });

            setTimeout(() => {
                isAnimating = false;
            }, 300);
        }

        prevBtn.addEventListener('click', () => goToIndex(currentIdx - 1));
        nextBtn.addEventListener('click', () => goToIndex(currentIdx + 1));

        thumbnailItems.forEach((thumb, index) => {
            thumb.addEventListener('click', () => {

                thumb.classList.add('click-feedback');
                setTimeout(() => thumb.classList.remove('click-feedback'), 200);
                
                goToIndex(index);
            });
        });

        mainCarousel.addEventListener('scroll', () => {
            if (isAnimating) return;
            
            const newIndex = Math.round(mainCarousel.scrollLeft / itemWidth);
            if (newIndex !== currentIdx) {
                currentIdx = newIndex;
                updateActiveThumbnail(currentIdx);
                updateButtons();
            }
        });

        updateActiveThumbnail(0);
        updateButtons();

        window.addEventListener('resize', () => {
            const newItemWidth = carouselItems[0]?.offsetWidth;
            mainCarousel.scrollLeft = currentIdx * newItemWidth;
            updateActiveThumbnail(currentIdx);
        });
    };
    
    initCarousel();

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
    });
})


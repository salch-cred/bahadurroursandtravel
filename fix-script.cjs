const fs = require('fs');
const path = require('path');

const cdnLink = '<link rel="stylesheet" href="https://cdn.hugeicons.com/font/hgi-stroke-rounded.css" />';

const iconMap = {
    '⌕': '<i class="hgi-stroke hgi-search-01"></i>',
    '☰': '<i class="hgi-stroke hgi-menu-01"></i>',
    '⌘': '<i class="hgi-stroke hgi-dashboard-square-01"></i>',
    '▶': '<i class="hgi-stroke hgi-play"></i>',
    '→': '<i class="hgi-stroke hgi-arrow-right-01"></i>',
    '↗': '<i class="hgi-stroke hgi-arrow-up-right-01"></i>',
    '✓': '<i class="hgi-stroke hgi-tick-02"></i>',
    '◎': '<i class="hgi-stroke hgi-information-circle"></i>'
};

const imageMap = {
    'assets/images/packages/kerala.jpg': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?q=80&w=800&auto=format&fit=crop',
    'assets/images/packages/tirupati.jpg': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=800&auto=format&fit=crop',
    'assets/images/packages/ajmer.jpg': 'https://images.unsplash.com/photo-1599321305417-7a52e9f69201?q=80&w=800&auto=format&fit=crop',
    'assets/images/packages/kashmir.jpg': 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?q=80&w=800&auto=format&fit=crop',
    'assets/images/packages/goa.jpg': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=800&auto=format&fit=crop',
    'assets/images/packages/dubai.jpg': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop',
    'assets/images/packages/thailand.jpg': 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=800&auto=format&fit=crop',
    'assets/images/packages/maldives.jpg': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=800&auto=format&fit=crop',
    'assets/images/packages/umrah.jpg': 'https://images.unsplash.com/photo-1565552643952-b4b159b3bb6a?q=80&w=800&auto=format&fit=crop'
};

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                processDirectory(fullPath);
            }
        } else {
            if (fullPath.endsWith('.html')) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let modified = false;

                if (!content.includes('hgi-stroke-rounded.css')) {
                    content = content.replace('</head>', `    ${cdnLink}\n</head>`);
                    modified = true;
                }

                for (const [char, icon] of Object.entries(iconMap)) {
                    if (content.includes(char)) {
                        content = content.replaceAll(char, icon);
                        modified = true;
                    }
                }
                
                // Fix possible css issues from hugeicons inline
                if (content.includes('hugeicons')) {
                    // if some icons have bad vertical align
                }

                if (modified) {
                    fs.writeFileSync(fullPath, content);
                    console.log('Updated HTML:', fullPath);
                }
            } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let modified = false;

                for (const [localImg, unsplashImg] of Object.entries(imageMap)) {
                    if (content.includes(localImg)) {
                        content = content.replaceAll(localImg, unsplashImg);
                        modified = true;
                    }
                }

                // also search for specific unicode chars in JS (like '✓')
                for (const [char, icon] of Object.entries(iconMap)) {
                    if (content.includes(char)) {
                        content = content.replaceAll(char, icon);
                        modified = true;
                    }
                }

                if (modified) {
                    fs.writeFileSync(fullPath, content);
                    console.log('Updated JS/TS:', fullPath);
                }
            }
        }
    }
}

processDirectory(__dirname);
console.log('Done');

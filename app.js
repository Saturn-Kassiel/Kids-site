const Media = {
    audio: new Audio(),
    video: document.getElementById('global-video'),
    currentList: [],
    index: 0,
    isRepeat: false,

    init() {
        this.audio.onended = () => this.isRepeat ? this.play(this.currentList[this.index]) : this.next();
    },

    play(item) {
        this.audio.src = item.audio;
        this.video.src = item.video;
        this.audio.play();
        this.video.play();
        document.getElementById('play-pause').innerText = "⏸️";
    },

    toggle() {
        this.audio.paused ? (this.audio.play(), this.video.play()) : (this.audio.pause(), this.video.pause());
        document.getElementById('play-pause').innerText = this.audio.paused ? "▶️" : "⏸️";
    },

    next() {
        this.index = (this.index + 1) % this.currentList.length;
        this.play(this.currentList[this.index]);
    },

    prev() {
        this.index = (this.index - 1 + this.currentList.length) % this.currentList.length;
        this.play(this.currentList[this.index]);
    },

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        document.getElementById('repeat-btn').style.opacity = this.isRepeat ? "1" : "0.5";
    }
};

function navigateTo(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.getElementById('back-btn').classList.toggle('hidden', id === 'main');
    
    if (['alphabet', 'numbers', 'colors'].includes(id)) loadMediaSection(id);
}

function loadMediaSection(type) {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = "";
    navigateTo('media-section');

    let items = [];
    if (type === 'alphabet') {
        const letters = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split("");
        items = letters.map(l => ({
            name: l,
            audio: `letters_songs/bukva_${l.toLowerCase()}.mp3`,
            video: `letters_video/bukva_${l.toLowerCase()}.mp4`
        }));
    }
    // Аналогично для numbers и colors...

    Media.currentList = items;
    items.forEach((item, i) => {
        const btn = document.createElement('button');
        btn.className = "menu-card";
        btn.innerText = item.name;
        btn.onclick = () => { Media.index = i; Media.play(item); };
        grid.appendChild(btn);
    });
}

function toggleTheme() {
    const html = document.documentElement;
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
}

// Админка
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#see') {
        if (prompt("Пароль:") === "1239940") navigateTo('admin-panel');
    }
});

async function saveToGitHub(content, filePath, msg) {
    const token = prompt("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");
    const repo = "Saturn-Kassiel/Kids-site";
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;

    const res = await fetch(url, { headers: { "Authorization": `token ${token}` } });
    const data = await res.json();

    await fetch(url, {
        method: "PUT",
        headers: { "Authorization": `token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, content: btoa(unescape(encodeURIComponent(content))), sha: data.sha })
    });
    confetti({ particleCount: 150 });
}

Media.init();
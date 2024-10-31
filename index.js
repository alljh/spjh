const firebaseConfig = {
    apiKey: "AIzaSyAzqCGmaVBSET4EuZeozA8Z1Wqz5NjM2CU",
    authDomain: "brave-streamer-415008.firebaseapp.com", 
    projectId: "brave-streamer-415008",
    storageBucket: "brave-streamer-415008.appspot.com",
    messagingSenderId: "415155981046",
    appId: "1:415155981046:web:673979afa261a63ac37ad7"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

const postContent = document.getElementById('postContent');
const charCount = document.getElementById('charCount');
const submitButton = document.getElementById('submitButton');
const postMedia = document.getElementById('postMedia');
const mediaPreview = document.getElementById('mediaPreview');

function updateCharCount() {
    const currentLength = postContent.value.length;
    charCount.textContent = `已輸入 ${currentLength} 字`;
    
    if (currentLength < 3) {
        charCount.classList.add('text-red-400');
    } else {
        charCount.classList.remove('text-red-400');
    }
}

postContent.addEventListener('input', updateCharCount);

postMedia.addEventListener('change', function(e) {
    handleMediaFiles(e.target.files);
});

function handleMediaFiles(files) {
    const totalFiles = mediaPreview.children.length + files.length;
    if (totalFiles > 1) {
        alert('最多只能上傳一個檔案');
        return;
    }

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const mediaElement = document.createElement('img');
            mediaElement.src = e.target.result;
            mediaElement.classList.add('w-full', 'h-full', 'object-cover', 'rounded-xl', 'shadow-lg', 'transition-all');
            const deleteButton = createDeleteButton();
            const container = document.createElement('div');
            container.classList.add('relative');
            container.appendChild(mediaElement);
            container.appendChild(deleteButton);
            mediaPreview.appendChild(container);
        }
        reader.readAsDataURL(file);
    });
}

function createDeleteButton() {
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '×';
    deleteButton.classList.add('absolute', 'top-2', 'right-2', 'bg-red-500', 'text-white', 'rounded-full', 'w-8', 'h-8', 'flex', 'items-center', 'justify-center', 'text-xl', 'font-bold', 'hover:bg-red-600', 'transition-colors', 'shadow-lg');
    deleteButton.addEventListener('click', function(e) {
        e.preventDefault();
        this.parentElement.remove();
    });
    return deleteButton;
}

document.getElementById('postForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const content = postContent.value;
    
    if (content.trim().length < 3) {
        alert('請輸入至少3個字');
        return;
    }
    
    submitButton.innerHTML = '<div class="spinner mx-auto"></div>';
    submitButton.disabled = true;
    
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        const ipAddress = ipData.ip;
        
        const mediaUrls = [];
        
        // 處理上傳的圖片
        if (postMedia.files.length > 0) {
            const file = postMedia.files[0];
            const storageRef = storage.ref('media/' + Date.now() + '_' + file.name);
            await storageRef.put(file);
            const url = await storageRef.getDownloadURL();
            mediaUrls.push({
                url: url,
                type: 'image'
            });
        }
        
        // 處理選擇的GIF
        const gifPreview = mediaPreview.querySelector('img[src^="https://media"]');
        if (gifPreview) {
            // 從 Giphy URL 獲取 GIF 數據
            const response = await fetch(gifPreview.src);
            const blob = await response.blob();
            
            // 上傳到 Firebase Storage
            const storageRef = storage.ref('media/gif_' + Date.now() + '.gif');
            await storageRef.put(blob);
            const url = await storageRef.getDownloadURL();
            
            mediaUrls.push({
                url: url,
                type: 'gif'
            });
        }

        // 獲取所有用戶
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs;
        
        if (users.length === 0) {
            throw new Error('沒有可用的用戶');
        }

        // 隨機選擇一個用戶
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const assignedUser = randomUser.data().name;

        const postData = {
            content: content,
            mediaUrls: mediaUrls,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            ipAddress: ipAddress,
            status: 'pending',
            createdDate: new Date().toISOString(),
            replyCount: 0,
            isReply: false,
            assignedUser: randomUser.id
        };

        // 創建新貼文
        await db.collection('posts').add(postData);

        // 重置表單
        postContent.value = '';
        mediaPreview.innerHTML = '';
        charCount.textContent = '已輸入 0 字';
        
        submitButton.innerHTML = `
            <span>發布成功</span>
            <svg class="h-8 w-8 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
        `;
        
        setTimeout(() => {
            submitButton.innerHTML = `
                <span>發布貼文</span>
                <svg class="h-8 w-8 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
            `;
            submitButton.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Error:', error);
        submitButton.innerHTML = `
            <span>發布失敗</span>
            <svg class="h-8 w-8 ml-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        `;
        setTimeout(() => {
            submitButton.innerHTML = `
                <span>發布貼文</span>
                <svg class="h-8 w-8 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
            `;
            submitButton.disabled = false;
        }, 2000);
    }
});

// 生成星星的函數
function createStars() {
    const container = document.getElementById('starsContainer');
    const starCount = 150; // 增加星星數量

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        const left = Math.random() * 100;
        star.style.left = `${left}%`;
        
        const size = Math.random() * 4;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        const duration = 4 + Math.random() * 8;
        star.style.setProperty('--duration', `${duration}s`);
        
        const delay = Math.random() * 5;
        star.style.animationDelay = `${delay}s`;
        
        container.appendChild(star);
    }
}

window.addEventListener('load', createStars);
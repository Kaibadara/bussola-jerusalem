/* ═══════════════════════════════════════════════════════════════
   👥 COMMUNITY MODULE — Bússola para Jerusalém (Firebase)
   © 2026 Marcos Fernando — C4 Corporation
   
   Comunidade: Auth Anônimo, Perfis, Posts, Comentários
   Firestore em tempo real — sem servidor próprio
   ═══════════════════════════════════════════════════════════════ */

const CommunityModule = (() => {
    // ══════════════════════════════════════
    // 🔥 CONFIGURAÇÃO FIREBASE
    // ⚠️ SUBSTITUA pelos dados do SEU projeto Firebase
    // ══════════════════════════════════════
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyAR3eMwAJqjR7r1g5xFa5OVULvbYwntnxc",
        authDomain: "bussola-jerusalem-34859.firebaseapp.com",
        projectId: "bussola-jerusalem-34859",
        storageBucket: "bussola-jerusalem-34859.firebasestorage.app",
        messagingSenderId: "568770729611",
        appId: "1:568770729611:web:d8f0513dd3a22d6dfbe68e"
    };

    let db = null;
    let auth = null;
    let currentUser = null;
    let currentProfile = null;
    let currentFilter = '';
    let unsubscribePosts = null;
    let firebaseReady = false;

    // ═══════════════════════════════════
    // INICIALIZAÇÃO DO FIREBASE
    // ═══════════════════════════════════

    async function initFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            db = firebase.firestore();
            auth = firebase.auth();

            // Escuta mudanças de autenticação
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    currentUser = user;
                    await loadProfile();
                    updateAuthUI();
                    subscribeToPosts();
                } else {
                    currentUser = null;
                    currentProfile = null;
                    updateAuthUI();
                }
            });

            firebaseReady = true;
            console.log('🔥 Firebase conectado');
            return true;
        } catch (e) {
            console.error('❌ Erro ao inicializar Firebase:', e);
            firebaseReady = false;
            return false;
        }
    }

    // ═══════════════════════════════════
    // AUTENTICAÇÃO (Login Anônimo + Nome)
    // ═══════════════════════════════════

    async function signInAnonymously(displayName) {
        try {
            const result = await auth.signInAnonymously();
            const user = result.user;

            // Cria perfil no Firestore
            await db.collection('profiles').doc(user.uid).set({
                name: displayName,
                avatar_emoji: '🕎',
                bio: '',
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                uid: user.uid
            }, { merge: true });

            currentUser = user;
            await loadProfile();
            updateAuthUI();
            subscribeToPosts();

            return { ok: true };
        } catch (e) {
            console.error('Erro login:', e);
            return { ok: false, error: e.message };
        }
    }

    async function loadProfile() {
        if (!currentUser) return null;
        try {
            const doc = await db.collection('profiles').doc(currentUser.uid).get();
            if (doc.exists) {
                currentProfile = { id: doc.id, ...doc.data() };
            } else {
                currentProfile = {
                    id: currentUser.uid,
                    name: 'Peregrino',
                    avatar_emoji: '🕎',
                    bio: ''
                };
            }
            return currentProfile;
        } catch (e) {
            console.error('Erro ao carregar perfil:', e);
            return null;
        }
    }

    function logout() {
        if (auth) {
            auth.signOut();
        }
        currentUser = null;
        currentProfile = null;
        localStorage.removeItem('bj_session');
        if (unsubscribePosts) {
            unsubscribePosts();
            unsubscribePosts = null;
        }
        updateAuthUI();
        const postsList = document.getElementById('posts-list');
        if (postsList) postsList.innerHTML = '';
    }

    function isAuthenticated() {
        return !!currentUser && !!currentProfile;
    }

    // ═══════════════════════════════════
    // UI DE AUTENTICAÇÃO
    // ═══════════════════════════════════

    function updateAuthUI() {
        const authArea = document.getElementById('community-auth-area');
        if (!authArea) return;

        if (currentUser && currentProfile) {
            authArea.innerHTML = `
                <div class="user-bar">
                    <span class="user-avatar">${currentProfile.avatar_emoji || '🕎'}</span>
                    <span class="user-name">${currentProfile.name}</span>
                    <button class="btn-small" onclick="CommunityModule.showProfile()">⚙️</button>
                    <button class="btn-small btn-logout" onclick="CommunityModule.logout()">Sair</button>
                </div>
            `;
            const createPost = document.getElementById('create-post-area');
            if (createPost) createPost.classList.remove('hidden');
        } else {
            authArea.innerHTML = `
                <div class="auth-invite">
                    <p>Entre na comunidade para participar!</p>
                    <button class="sacred-btn" onclick="CommunityModule.showLoginModal()">
                        ✡ Entrar na Comunidade
                    </button>
                </div>
            `;
            const createPost = document.getElementById('create-post-area');
            if (createPost) createPost.classList.add('hidden');
        }
    }

    /**
     * Modal de login simples (só pede nome)
     */
    function showLoginModal() {
        let modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('hidden');
            return;
        }

        modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content login-modal-content">
                <button class="modal-close-btn" onclick="document.getElementById('login-modal').classList.add('hidden')">✕</button>
                <div class="modal-icon">🕎</div>
                <h2>Entrar na Comunidade</h2>

                <div id="login-step-1" class="login-step">
                    <label>Seu nome ou apelido:</label>
                    <input type="text" id="login-name" class="sacred-input" placeholder="Como quer ser chamado?" maxlength="30">
                    <button id="login-send-btn" class="sacred-btn" onclick="CommunityModule.handleLogin()">
                        ✡ Entrar
                    </button>
                    <p id="login-msg-1" class="login-msg"></p>
                    <p style="text-align:center; color: var(--text-muted); font-size: 0.8em; margin-top: 8px;">
                        Não precisa de email! Escolha um nome e entre.
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        setTimeout(() => {
            const input = document.getElementById('login-name');
            if (input) input.focus();
        }, 200);
    }

    async function handleLogin() {
        const nameInput = document.getElementById('login-name');
        const msg = document.getElementById('login-msg-1');
        const btn = document.getElementById('login-send-btn');
        const name = nameInput ? nameInput.value.trim() : '';

        if (!name || name.length < 2) {
            msg.textContent = '⚠️ Digite um nome com pelo menos 2 caracteres';
            msg.className = 'login-msg error';
            return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Entrando...';
        msg.textContent = '';

        const result = await signInAnonymously(name);

        if (result.ok) {
            msg.textContent = '✅ Bem-vindo à comunidade!';
            msg.className = 'login-msg success';
            setTimeout(() => {
                document.getElementById('login-modal').classList.add('hidden');
            }, 800);
        } else {
            msg.textContent = `❌ Erro: ${result.error}`;
            msg.className = 'login-msg error';
        }

        btn.disabled = false;
        btn.textContent = '✡ Entrar';
    }

    // Stubs removidos — sistema antigo de email/token não é mais usado

    // ═══════════════════════════════════
    // PERFIL
    // ═══════════════════════════════════

    function showProfile() {
        if (!currentUser || !currentProfile) return;

        let modal = document.getElementById('profile-modal');
        if (modal) modal.remove();

        const emojis = ['🕎', '✡', '🕊️', '📖', '🙏', '⭐', '🌿', '🔥', '🌙', '👑', '🦁', '🐑', '💎', '🏔️', '🌅'];

        modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content profile-modal-content">
                <button class="modal-close-btn" onclick="document.getElementById('profile-modal').classList.add('hidden')">✕</button>
                <h2>⚙️ Seu Perfil</h2>
                
                <div class="profile-avatar-select">
                    <label>Avatar:</label>
                    <div class="emoji-grid">
                        ${emojis.map(e => `
                            <button class="emoji-btn ${e === currentProfile.avatar_emoji ? 'active' : ''}" 
                                    onclick="CommunityModule.selectAvatar('${e}', this)">${e}</button>
                        `).join('')}
                    </div>
                </div>

                <label>Nome:</label>
                <input type="text" id="profile-name" class="sacred-input" 
                       value="${currentProfile.name}" maxlength="50">

                <label>Bio:</label>
                <textarea id="profile-bio" class="sacred-input sacred-textarea" 
                          maxlength="300" placeholder="Conte um pouco sobre você...">${currentProfile.bio || ''}</textarea>

                <button class="sacred-btn" onclick="CommunityModule.saveProfile()">
                    💾 Salvar Perfil
                </button>
                <p id="profile-msg" class="login-msg"></p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    let selectedAvatar = null;

    function selectAvatar(emoji, btn) {
        selectedAvatar = emoji;
        document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    async function saveProfile() {
        const name = document.getElementById('profile-name').value.trim();
        const bio = document.getElementById('profile-bio').value.trim();
        const msg = document.getElementById('profile-msg');

        if (!name || name.length < 2) {
            msg.textContent = '⚠️ Nome precisa ter pelo menos 2 caracteres';
            msg.className = 'login-msg error';
            return;
        }

        try {
            const updates = { name, bio, uid: currentUser.uid };
            if (selectedAvatar) updates.avatar_emoji = selectedAvatar;

            await db.collection('profiles').doc(currentUser.uid).set(updates, { merge: true });
            await loadProfile();
            updateAuthUI();

            msg.textContent = '✅ Perfil salvo!';
            msg.className = 'login-msg success';
            selectedAvatar = null;
        } catch (e) {
            msg.textContent = `❌ Erro ao salvar: ${e.message}`;
            msg.className = 'login-msg error';
        }
    }

    // ═══════════════════════════════════
    // POSTS (Firestore em tempo real)
    // ═══════════════════════════════════

    function subscribeToPosts(type = '') {
        if (unsubscribePosts) {
            unsubscribePosts();
        }

        currentFilter = type;
        const container = document.getElementById('posts-list');
        if (!container) return;

        container.innerHTML = '<div class="loading-posts">🕎 Carregando...</div>';

        let query = db.collection('posts').orderBy('created_at', 'desc').limit(50);
        if (type) {
            query = query.where('type', '==', type);
        }

        // Escuta em tempo real!
        unsubscribePosts = query.onSnapshot((snapshot) => {
            const posts = [];
            snapshot.forEach(doc => {
                posts.push({ id: doc.id, ...doc.data() });
            });
            renderPosts(posts, container);
        }, (error) => {
            console.error('Erro ao carregar posts:', error);
            container.innerHTML = '<p class="post-empty">Erro ao carregar posts</p>';
        });
    }

    function loadPosts(type = '') {
        subscribeToPosts(type);

        // Atualiza filtros ativos
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            if (type === '' && onclick.includes("''")) btn.classList.add('active');
            else if (type && onclick.includes(`'${type}'`)) btn.classList.add('active');
        });
    }

    function renderPosts(posts, container) {
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="post-empty">
                    <span class="empty-icon">🕊️</span>
                    <p>Nenhuma mensagem ainda. Seja o primeiro a compartilhar!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = posts.map(post => renderPost(post)).join('');
    }

    function renderPost(post) {
        const typeIcons = { message: '💬', study: '📖', prayer: '🙏', testimony: '⭐' };
        const typeLabels = { message: 'Mensagem', study: 'Estudo', prayer: 'Oração', testimony: 'Testemunho' };

        const icon = typeIcons[post.type] || '💬';
        const label = typeLabels[post.type] || 'Mensagem';

        let dateStr = '';
        if (post.created_at && post.created_at.toDate) {
            dateStr = post.created_at.toDate().toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } else if (post.created_at) {
            dateStr = new Date(post.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }

        const isAuthor = currentUser && currentUser.uid === post.uid;
        const likes = post.likes || [];
        const liked = currentUser && likes.includes(currentUser.uid);
        const commentCount = post.comment_count || 0;

        return `
            <div class="post-card" id="post-${post.id}">
                <div class="post-header">
                    <span class="post-avatar">${post.author_avatar || '🕎'}</span>
                    <div class="post-meta">
                        <span class="post-author">${escapeHtml(post.author_name || 'Anônimo')}</span>
                        <span class="post-date">${dateStr}</span>
                    </div>
                    <span class="post-type-badge">${icon} ${label}</span>
                </div>
                ${post.title ? `<h3 class="post-title">${escapeHtml(post.title)}</h3>` : ''}
                <div class="post-content">${escapeHtml(post.content)}</div>
                <div class="post-actions">
                    <button class="post-action-btn ${liked ? 'liked' : ''}" onclick="CommunityModule.toggleLike('${post.id}')">
                        ${liked ? '❤️' : '🤍'} ${likes.length}
                    </button>
                    <button class="post-action-btn" onclick="CommunityModule.toggleComments('${post.id}')">
                        💬 ${commentCount}
                    </button>
                    ${isAuthor ? `<button class="post-action-btn post-delete" onclick="CommunityModule.deletePost('${post.id}')">🗑️</button>` : ''}
                </div>
                <div id="comments-${post.id}" class="comments-section hidden"></div>
            </div>
        `;
    }

    let isSubmitting = false;

    /**
     * Cria um novo post
     */
    async function createPost() {
        if (!currentUser || !currentProfile) {
            showLoginModal();
            return;
        }

        if (isSubmitting) return;

        const content = document.getElementById('post-content').value.trim();
        const title = document.getElementById('post-title').value.trim();
        const type = document.getElementById('post-type').value;

        if (!content) {
            alert('Escreva algo para publicar!');
            return;
        }

        isSubmitting = true;
        const publishBtn = document.querySelector('#create-post-area .sacred-btn');
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.textContent = '⏳ Publicando...';
        }

        try {
            await db.collection('posts').add({
                content,
                title: title || '',
                type: type || 'message',
                uid: currentUser.uid,
                author_name: currentProfile.name,
                author_avatar: currentProfile.avatar_emoji || '🕎',
                likes: [],
                comment_count: 0,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.getElementById('post-content').value = '';
            document.getElementById('post-title').value = '';
            // Posts atualizam automaticamente via onSnapshot
        } catch (e) {
            console.error('Erro ao criar post:', e);
            alert('Erro ao publicar. Tente novamente.');
        } finally {
            isSubmitting = false;
            if (publishBtn) {
                publishBtn.disabled = false;
                publishBtn.textContent = '✡ Publicar';
            }
        }
    }

    /**
     * Deleta um post
     */
    async function deletePost(postId) {
        if (!confirm('Tem certeza que deseja remover este post?')) return;

        try {
            const comments = await db.collection('posts').doc(postId).collection('comments').get();
            const batch = db.batch();
            comments.forEach(doc => batch.delete(doc.ref));
            batch.delete(db.collection('posts').doc(postId));
            await batch.commit();
        } catch (e) {
            console.error('Erro ao deletar:', e);
        }
    }

    /**
     * Like/Unlike (toggle)
     */
    async function toggleLike(postId) {
        if (!currentUser) {
            showLoginModal();
            return;
        }

        try {
            const postRef = db.collection('posts').doc(postId);
            const doc = await postRef.get();
            if (!doc.exists) return;

            const likes = doc.data().likes || [];
            const uid = currentUser.uid;

            if (likes.includes(uid)) {
                await postRef.update({ likes: firebase.firestore.FieldValue.arrayRemove(uid) });
            } else {
                await postRef.update({ likes: firebase.firestore.FieldValue.arrayUnion(uid) });
            }
        } catch (e) {
            console.error('Erro ao curtir:', e);
        }
    }

    /**
     * Mostra/esconde comentários de um post
     */
    async function toggleComments(postId) {
        const section = document.getElementById(`comments-${postId}`);
        if (!section) return;

        if (!section.classList.contains('hidden')) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        section.innerHTML = '<div class="loading-posts">Carregando comentários...</div>';

        try {
            const snapshot = await db.collection('posts').doc(postId)
                .collection('comments')
                .orderBy('created_at', 'asc')
                .get();

            let html = '';
            if (snapshot.size > 0) {
                snapshot.forEach(doc => {
                    const c = doc.data();
                    html += `
                        <div class="comment">
                            <span class="comment-avatar">${c.author_avatar || '🕎'}</span>
                            <div class="comment-body">
                                <span class="comment-author">${escapeHtml(c.author_name || 'Anônimo')}</span>
                                <span class="comment-text">${escapeHtml(c.content)}</span>
                            </div>
                        </div>
                    `;
                });
            } else {
                html = '<p class="no-comments">Sem comentários ainda</p>';
            }

            if (currentUser && currentProfile) {
                html += `
                    <div class="comment-form">
                        <input type="text" id="comment-input-${postId}" class="sacred-input" 
                               placeholder="Escreva um comentário..." maxlength="500">
                        <button class="btn-small sacred-btn" onclick="CommunityModule.addComment('${postId}')">Enviar</button>
                    </div>
                `;
            }

            section.innerHTML = html;
        } catch (e) {
            console.error('Erro ao carregar comentários:', e);
            section.innerHTML = '<p class="no-comments">Erro ao carregar</p>';
        }
    }

    /**
     * Adiciona comentário
     */
    async function addComment(postId) {
        const input = document.getElementById(`comment-input-${postId}`);
        if (!input || !input.value.trim()) return;

        try {
            await db.collection('posts').doc(postId).collection('comments').add({
                content: input.value.trim(),
                uid: currentUser.uid,
                author_name: currentProfile.name,
                author_avatar: currentProfile.avatar_emoji || '🕎',
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('posts').doc(postId).update({
                comment_count: firebase.firestore.FieldValue.increment(1)
            });

            // Recarrega comentários
            const section = document.getElementById(`comments-${postId}`);
            if (section) section.classList.add('hidden');
            toggleComments(postId);
        } catch (e) {
            console.error('Erro ao comentar:', e);
        }
    }

    // ═══════════════════════════════════
    // NOTIFICAÇÕES (simplificado)
    // ═══════════════════════════════════

    function showNotifications() {
        alert('🔔 Os posts aparecem em tempo real automaticamente!');
    }

    // ═══════════════════════════════════
    // UTILITÁRIOS
    // ═══════════════════════════════════

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    /**
     * Inicializa o módulo
     */
    async function init() {
        const ok = await initFirebase();

        if (!ok) {
            console.log('👥 Comunidade: Firebase não disponível');
            const authArea = document.getElementById('community-auth-area');
            if (authArea) {
                authArea.innerHTML = `
                    <div class="auth-invite">
                        <p style="text-align:center; color: var(--text-muted); padding: var(--spacing-md);">
                            🌐 Erro ao conectar à comunidade.<br>
                            <small>Verifique sua conexão com a internet.</small>
                        </p>
                    </div>
                `;
            }
            return;
        }

        if (!currentUser) {
            updateAuthUI();
            // Só faz subscribe aqui se NÃO tiver user logado
            // (se tiver, o onAuthStateChanged já fez o subscribe)
            subscribeToPosts();
        }

        console.log('👥 Módulo da comunidade inicializado (Firebase)');
    }

    // API Pública
    return {
        init,
        showLoginModal,
        handleLogin,
        showProfile,
        selectAvatar,
        saveProfile,
        loadPosts,
        createPost,
        deletePost,
        toggleLike,
        toggleComments,
        addComment,
        showNotifications,
        logout,
        isAuthenticated: () => !!currentUser && !!currentProfile
    };
})();

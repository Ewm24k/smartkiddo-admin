const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set securely in Render dashboard
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'Ewm24k';
const GITHUB_REPO = process.env.GITHUB_REPO || 'smartkiddo-verse'; // Updated default fallback to smartkiddo-verse
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// Helper for making requests to the GitHub REST API
async function githubRequest(endpoint, options = {}) {
    const url = `https://api.github.com${endpoint}`;
    const headers = {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'SmartKiddo-Sync-API',
        ...options.headers
    };
    
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`GitHub API Error (${response.status}): ${errorMsg}`);
    }
    return response.json();
}

// -----------------------------------------------------------------
// Route 1: Sync (GET) - Pull files from GitHub and build tree
// -----------------------------------------------------------------
app.get('/api/sync', async (req, res) => {
    try {
        if (!GITHUB_TOKEN) {
            return res.status(500).json({ error: "Missing GITHUB_TOKEN environment variable on backend." });
        }

        // 1. Fetch the flat recursive Git tree from GitHub
        const treeData = await githubRequest(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`);
        
        // 2. Filter system and ignored items
        const filteredTree = treeData.tree.filter(item => {
            return !item.path.startsWith('.') && 
                   !item.path.includes('node_modules/') && 
                   item.path !== 'package.json' && 
                   item.path !== 'server.js';
        });

        // 3. Rebuild flat items list into the nested fileSystem arrays expected by the UI
        const rootNodes = [];
        const foldersMap = {};

        // Process folders first to ensure parents are ready
        const sortedTree = filteredTree.sort((a, b) => a.path.localeCompare(b.path));

        for (const item of sortedTree) {
            const parts = item.path.split('/');
            const name = parts[parts.length - 1];
            const isFolder = item.type === 'tree';

            const node = {
                id: 'gh_' + item.sha,
                name: name,
                type: isFolder ? 'folder' : 'file',
                path: item.path // Stored temporarily to fetch content later
            };

            if (isFolder) {
                node.isOpen = true;
                node.children = [];
                foldersMap[item.path] = node;
            } else {
                const ext = name.split('.').pop().toLowerCase();
                const isMedia = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'mp4', 'webm', 'ogg'].includes(ext);
                node.isMedia = isMedia;
                if (isMedia) {
                    node.format = ['mp4', 'webm', 'ogg'].includes(ext) ? 'video' : 'image';
                    // Route through our media proxy to avoid exposing credentials
                    node.url = `/api/media?path=${encodeURIComponent(item.path)}`;
                    node.content = '';
                } else {
                    node.content = ''; // Populate via Raw files
                }
            }

            if (parts.length === 1) {
                rootNodes.push(node);
            } else {
                const parentPath = parts.slice(0, -1).join('/');
                if (foldersMap[parentPath]) {
                    foldersMap[parentPath].children.push(node);
                } else {
                    rootNodes.push(node);
                }
            }
        }

        // 4. Hydrate code files with text from GitHub Raw CDN
        async function fetchContent(nodesList) {
            for (let node of nodesList) {
                if (node.type === 'file' && !node.isMedia) {
                    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${node.path}`;
                    const rawRes = await fetch(rawUrl, {
                        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
                    });
                    if (rawRes.ok) {
                        node.content = await rawRes.text();
                    } else {
                        node.content = `/* Error loading content from GitHub */`;
                    }
                } else if (node.type === 'folder' && node.children) {
                    await fetchContent(node.children);
                }
            }
        }

        await fetchContent(rootNodes);

        // Remove the temporary path parameter before responding
        function stripPathProperty(nodesList) {
            nodesList.forEach(node => {
                delete node.path;
                if (node.children) stripPathProperty(node.children);
            });
        }
        stripPathProperty(rootNodes);

        res.json(rootNodes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -----------------------------------------------------------------
// Route 2: Send & Sync (POST) - Push modified workspace files back
// -----------------------------------------------------------------
app.post('/api/send-sync', async (req, res) => {
    try {
        const fileSystem = req.body;
        if (!Array.isArray(fileSystem)) {
            return res.status(400).json({ error: "Invalid payload. Array expected." });
        }

        // 1. Flatten the nested folder arrays to absolute path mappings
        function flatten(nodesList, currentPath = '') {
            let list = [];
            for (const node of nodesList) {
                const absolutePath = currentPath ? `${currentPath}/${node.name}` : node.name;
                if (node.type === 'file') {
                    list.push({
                        path: absolutePath,
                        content: node.content,
                        isMedia: node.isMedia
                    });
                } else if (node.type === 'folder' && node.children) {
                    list = list.concat(flatten(node.children, absolutePath));
                }
            }
            return list;
        }

        const flattenedFiles = flatten(fileSystem);

        // 2. Fetch current branch HEAD reference to establish base commit context
        const refData = await githubRequest(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`);
        const baseCommitSha = refData.object.sha;

        // 3. Fetch base commit to retrieve root tree structure
        const commitData = await githubRequest(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits/${baseCommitSha}`);
        const baseTreeSha = commitData.tree.sha;

        // 4. Build Tree request payloads (Code is sent directly as text blocks)
        const treeItems = flattenedFiles
            .filter(f => !f.isMedia) // Media files are pre-loaded in GitHub; skip uploading
            .map(file => ({
                path: file.path,
                mode: '100644',
                type: 'blob',
                content: file.content
            }));

        const newTreeData = await githubRequest(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees`, {
            method: 'POST',
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: treeItems
            })
        });

        // 5. Create new Commit
        const newCommitData = await githubRequest(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits`, {
            method: 'POST',
            body: JSON.stringify({
                message: 'Backup update from SmartKiddo Studio Workspace',
                tree: newTreeData.sha,
                parents: [baseCommitSha]
            })
        });

        // 6. Push Commit reference updates back onto the default branch
        await githubRequest(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`, {
            method: 'PATCH',
            body: JSON.stringify({
                sha: newCommitData.sha,
                force: true
            })
        });

        res.json({ success: true, sha: newCommitData.sha });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// -----------------------------------------------------------------
// Route 3: Secure Media Stream Proxy (Streams raw private files)
// -----------------------------------------------------------------
app.get('/api/media', async (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).send('Missing path parameter');
    try {
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;
        const response = await fetch(rawUrl, {
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` }
        });
        if (!response.ok) return res.status(response.status).send('Failed to obtain asset');

        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);

        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(PORT, () => console.log(`SmartKiddo Sync API working on port ${PORT}`));

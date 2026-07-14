import { Hono } from 'hono'
const app = new Hono()

// 1. PUBLIC READ ENDPOINT: Your future UI will fetch this JSON
app.get('/api/posts', async (c: any) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM posts ORDER BY created_at DESC").all();
  return c.json(results)
})

// 2. CLIENT WRITING DASHBOARD: HTML form with standard CSS
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Felix Dulce Admin Panel</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
    </head>
    <body>
      <h1>Felix Dulce Dashboard</h1>
      <p>Write your blog post below. When you click Publish, it will save straight to your database.</p>
      
      <form id="postForm">
        <label for="title">Post Title</label>
        <input type="text" id="title" required placeholder="My Amazing Blog Post">
        
        <label for="content">Markdown Content</label>
        <textarea id="content" rows="12" required placeholder="Write your post content here..."></textarea>
        
        <button type="submit">Publish Live</button>
      </form>

      <h2>Saved Drafts & Posts</h2>
      <div id="postsList">Loading existing content...</div>

      <script>
        const form = document.getElementById('postForm');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const title = document.getElementById('title').value;
          const content = document.getElementById('content').value;

          await fetch('/admin/save', {
            method: 'POST',
            body: JSON.stringify({ title, content }),
            headers: { 'Content-Type': 'application/json' }
          });
          alert('Successfully Published!');
          location.reload();
        };

        async function load() {
          const res = await fetch('/api/posts');
          const data = await res.json();
          const list = document.getElementById('postsList');
          if (data.length === 0) {
            list.innerHTML = '<p>No posts written yet. Get typing!</p>';
            return;
          }
          list.innerHTML = data.map(p => \`
            <div style="border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 10px;">
              <h3>\${p.title}</h3>
              <p style="font-size: 0.8rem; color: #777;">Published: \${new Date(p.created_at).toLocaleString()}</p>
            </div>
          \`).join('');
        }
        load();
      </script>
    </body>
    </html>
  `)
})

// 3. WRITE ENDPOINT: Saves client's posts to Cloudflare D1 SQL
app.post('/admin/save', async (c: any) => {
  const body = await c.req.json()
  const uuid = crypto.randomUUID()
  const dateStr = new Date().toISOString()

  await c.env.DB.prepare(
    "INSERT INTO posts (id, title, content, created_at) VALUES (?, ?, ?, ?)"
  ).bind(uuid, body.title, body.content, dateStr).run();

  return c.text('Saved successfully')
})

export default app

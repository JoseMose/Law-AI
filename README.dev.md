Development notes

If you experience 404s when the frontend calls API endpoints (for example DELETE requests returning 404 from `http://localhost:3000/s3/object`), your Create-React-App dev server proxy may not be forwarding that method in your environment.

You can set the backend URL explicitly for the frontend by creating a `.env.development` file in the project root with:

REACT_APP_API_URL=http://localhost:3001

Then restart the CRA server (`npm start` in the project root). This makes the frontend call `http://localhost:3001/...` directly instead of relying on the CRA proxy.

Alternatively, keep the proxy setting in `package.json` (already set) but test directly against port 3001 if you run into 404s.

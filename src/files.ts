/** @satisfies {import('@webcontainer/api').FileSystemTree} */

export const files = {
  "index.js": {
    file: {
      contents: `
import express from 'express';
const app = express();
const port = 3333;

app.get('/', (req, res) => {
  res.send('Welcome to a WebContainers app! Edit me!!! 🥳');
});

app.listen(port, () => {
  console.log(\`App is live at http://localhost:\${port}\`);
});`,
    },
  },
  "package.json": {
    file: {
      contents: `
{
  "name": "example-app",
  "type": "module",
  "dependencies": {
    "express": "latest",
    "nodemon": "latest"
  },
  "scripts": {
    "dev": "nodemon --watch './' index.js",
    "start": "nodemon --watch './' index.js"
  }
}`,
    },
  },
};

// post-service/src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

interface Post {
  id: number;
  title: string;
  description: string;
  content?: string;
  themeId?: number;
  authorId: number;
}

interface AuthenticatedRequest extends Request {
  user?: any;
}

let posts: Post[] = [];
let nextPostId = 1;

// Middleware para autenticação
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.sendStatus(401);
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.sendStatus(403);
      return;
    }
    req.user = user;
    next();
  });
}

app.post('/posts/create', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { title, description, themeId } = req.body;
  const post: Post = {
    id: nextPostId++,
    title,
    description,
    themeId,
    authorId: req.user.id,
  };
  posts.push(post);
  res.status(201).json(post);
});

app.put('/posts/edit/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const post = posts.find(p => p.id === +req.params.id);
  if (!post) {
    res.sendStatus(404);
    return;
  }
  if (post.authorId !== req.user.id) {
    res.status(403).json({ message: 'Não autorizado' });
    return;
  }

  Object.assign(post, req.body);
  res.json(post);
});

app.get('/posts', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  res.json(posts);
});

app.get('/posts/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const post = posts.find(p => p.id === +req.params.id);
  if (post) {
    res.json(post);
  } else {
    res.sendStatus(404);
  }
});

app.delete('/posts/delete/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const index = posts.findIndex(p => p.id === +req.params.id);
  if (index === -1) {
    res.sendStatus(404);
    return;
  }
  if (posts[index].authorId !== req.user.id) {
    res.status(403).json({ message: 'Não autorizado' });
    return;
  }

  posts.splice(index, 1);
  res.json({ message: 'Post deletado com sucesso' });
});

app.get('/posts/search/:query', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const query = req.params.query.toLowerCase();
  const results = posts.filter(post =>
    post.title.toLowerCase().includes(query) ||
    post.description.toLowerCase().includes(query)
  );
  res.json(results);
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Post Service rodando na porta ${PORT}`));

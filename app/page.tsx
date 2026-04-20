import { redirect } from 'next/navigation';

/** Root → manda pra login. Usuários autenticados são redirecionados pelo middleware. */
export default function Home() {
  redirect('/login');
}

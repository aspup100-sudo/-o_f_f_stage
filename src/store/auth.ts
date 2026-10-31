// 정식판 로그인 (Supabase Auth, 이메일 + 비밀번호).
import { client } from './remote';
import { setAuth, update } from './store';

type S = { user: { id: string; email?: string } } | null;
const toAuth = (s: S) => (s ? { uid: s.user.id, email: s.user.email } : null);

export function initAuth() {
  if (!client) { setAuth(null); return; }
  client.auth.getSession().then(({ data }) => setAuth(toAuth(data.session))).catch(() => setAuth(null));
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') update((s) => { s.session.recovery = true; });
    setAuth(toAuth(session));
  });
}

const msg = (e: { message?: string } | null | undefined) => {
  const m = e?.message ?? '';
  if (/Invalid login/i.test(m)) return '이메일이나 비밀번호가 맞지 않아요.';
  if (/already registered|already been registered/i.test(m)) return '이미 가입된 이메일이에요. 로그인해 주세요.';
  if (/Email not confirmed/i.test(m)) return '메일함에서 가입 확인 메일의 링크를 먼저 눌러 주세요.';
  if (/Password should be/i.test(m)) return '비밀번호는 6자 이상이어야 해요.';
  if (/rate limit/i.test(m)) return '요청이 너무 많아요. 잠시 뒤 다시 해 주세요.';
  if (/fetch|network/i.test(m)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
  return m || '잠시 뒤 다시 해 주세요.';
};

const here = () => location.origin + location.pathname;

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!client) return '서버가 연결되지 않았어요.';
  const { error } = await client.auth.signInWithPassword({ email, password });
  return error ? msg(error) : null;
}

/** 가입. 메일 확인을 켜 둔 서버면 confirm: true (메일함 확인 필요) */
export async function signUp(email: string, password: string): Promise<{ error?: string; confirm?: boolean }> {
  if (!client) return { error: '서버가 연결되지 않았어요.' };
  const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: here() } });
  if (error) return { error: msg(error) };
  return { confirm: !data.session };
}

export async function sendReset(email: string): Promise<string | null> {
  if (!client) return '서버가 연결되지 않았어요.';
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: here() });
  return error ? msg(error) : null;
}

export async function setNewPassword(password: string): Promise<string | null> {
  if (!client) return '서버가 연결되지 않았어요.';
  const { error } = await client.auth.updateUser({ password });
  if (!error) update((s) => { s.session.recovery = false; });
  return error ? msg(error) : null;
}

export async function signOut() {
  await client?.auth.signOut();
  setAuth(null);
}

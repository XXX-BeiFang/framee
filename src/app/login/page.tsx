/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useTheme } from 'next-themes'; // Import useTheme
import { ThemeProvider } from '@/components/ThemeProvider'; // Add this import

import { useSite } from '@/components/SiteProvider';
import BrandLogo from '@/components/BrandLogo';
import { Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'register';

const PASSWORD_MIN_LENGTH = 8;

function LoginPageClient() {
  const { setTheme } = useTheme(); // Destructure setTheme
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>('login');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shouldAskUsername, setShouldAskUsername] = useState(false);
  const [enableRegistration, setEnableRegistration] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { siteName } = useSite();

  // 在客户端挂载后设置配置
  useEffect(() => {
    // Load remembered username
    if (typeof window !== 'undefined') {
      const rememberedUsername = localStorage.getItem('rememberedUsername');
      const rememberedPassword = localStorage.getItem('rememberedPassword'); // New line
      if (rememberedUsername) {
        setUsername(rememberedUsername);
        if (rememberedPassword) { // New line
          setPassword(rememberedPassword); // New line
        } // New line
        setRememberMe(true); // Check remember me if username is found
      }

      const runtime = (window as any).RUNTIME_CONFIG;
      const storageType = runtime?.STORAGE_TYPE;
      setShouldAskUsername(storageType && storageType !== 'localstorage');
      setEnableRegistration(runtime?.ENABLE_REGISTRATION === true);
    }
  }, [setTheme]); // Add setTheme to dependency array

  // 注册需要服务端用户体系，因此必须同时满足「非 localstorage 模式」与「站点已开放注册」
  const canRegister = Boolean(shouldAskUsername && enableRegistration);
  const isRegister = mode === 'register';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!password || (shouldAskUsername && !username)) return;

    try {
      setLoading(true);
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          ...(shouldAskUsername ? { username } : {}),
        }),
      });

      if (res.ok) {
        // Save/clear remembered username and password
        if (rememberMe && username) {
          localStorage.setItem('rememberedUsername', username);
          localStorage.setItem('rememberedPassword', password); // New line
        } else {
          localStorage.removeItem('rememberedUsername');
          localStorage.removeItem('rememberedPassword'); // New line
        }
        const redirect = searchParams.get('redirect') || '/';
        router.replace(redirect);
      } else if (res.status === 401) {
        setError('密码错误');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '服务器错误');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!username || !password) return;

    // 客户端先做一遍快速校验，服务端仍会独立校验一次
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`密码至少需要 ${PASSWORD_MIN_LENGTH} 个字符`);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // 注册成功：切回登录模式并保留已填内容，直接点登录即可
        setMode('login');
        setConfirmPassword('');
        setNotice('注册成功，请使用该账号登录');
      } else {
        setError(data.error ?? '注册失败');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled = isRegister
    ? !username || !password || !confirmPassword || loading
    : !password || loading || (shouldAskUsername && !username);

  return (
    <div className='relative z-10 w-full sm:max-w-md lg:max-w-md rounded-3xl bg-black bg-opacity-70 p-10 shadow-2xl animate-slideUp'>
        {/* 登录页大尺寸区域使用 logo-dark.svg（登录页强制深色模式），自带副标题 */}
        <div className='mb-8 flex justify-center'>
          <BrandLogo variant='large' width={200} alt={siteName} />
        </div>
        <form
          onSubmit={isRegister ? handleRegister : handleSubmit}
          className='space-y-6'
        >
          {shouldAskUsername && (
            <div className="relative">
              <input
                id='username'
                type='text'
                autoComplete='username'
                className='block w-full rounded-md border border-gray-400 bg-transparent py-3 px-4 text-white focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-white sm:text-base'
                placeholder='用户名'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div className="relative">
            <input
              id='password'
              type={showPassword ? 'text' : 'password'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
                              className='block w-full rounded-md border border-gray-400 bg-transparent py-3 px-4 text-white focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-white sm:text-base'
              placeholder='密码'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-white focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="relative">
              <input
                id='confirm-password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='new-password'
                className='block w-full rounded-md border border-gray-400 bg-transparent py-3 px-4 text-white focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-white sm:text-base'
                placeholder='确认密码'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {/* Remember Me Checkbox */}
          {!isRegister && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="hidden peer" // Hide default, add peer
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me" className="flex items-center cursor-pointer">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded flex items-center justify-center peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all duration-200">
                    {rememberMe && (
                      <span className="text-white text-xs">✓</span>
                    )}
                  </div>
                  <span className="ml-2 text-sm text-gray-300">记住我</span>
                </label>
              </div>
            </div>
          )}

          {error && (
            <p className='text-sm text-red-500'>{error}</p>
          )}

          {notice && (
            <p className='text-sm text-emerald-400'>{notice}</p>
          )}

          {/* 提交按钮 */}
          <button
            type='submit'
            disabled={submitDisabled}
            className='inline-flex w-full justify-center rounded-lg bg-blue-400/70 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-blue-500/70 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {loading
              ? isRegister
                ? '注册中...'
                : '登录中...'
              : isRegister
                ? '注册'
                : '登录'}
          </button>

          {/* 登录 / 注册模式切换（仅当站点开放注册时显示） */}
          {canRegister && (
            <div className='text-center text-sm text-gray-400'>
              {isRegister ? (
                <>
                  已有账号？
                  <button
                    type='button'
                    onClick={() => switchMode('login')}
                    className='ml-1 text-blue-400 hover:text-blue-300 hover:underline'
                  >
                    返回登录
                  </button>
                </>
              ) : (
                <>
                  还没有账号？
                  <button
                    type='button'
                    onClick={() => switchMode('register')}
                    className='ml-1 text-blue-400 hover:text-blue-300 hover:underline'
                  >
                    立即注册
                  </button>
                </>
              )}
            </div>
          )}
        </form>
      </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThemeProvider forcedTheme="dark">
        <LoginPageClient />
      </ThemeProvider>
    </Suspense>
  );
}

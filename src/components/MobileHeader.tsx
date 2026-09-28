'use client';

import Link from 'next/link';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { BackButton } from './BackButton';
import BrandWordmark from './BrandWordmark';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

/**
 * H5 顶部栏：极简字标 + 搜索图标 + 个人头像。
 * 彻底取消左侧导航，导航职责交给底部 BottomNavigationBar。
 */
const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const router = useRouter();

  return (
    <header className='md:hidden relative w-full bg-transparent'>
      <div className='h-14 flex items-center justify-between px-4'>
        {/* 左侧：字标（或返回按钮） */}
        <div className='flex items-center gap-2'>
          {showBackButton ? (
            <BackButton />
          ) : (
            <Link href='/' aria-label='Framee 首页'>
              <BrandWordmark />
            </Link>
          )}
        </div>

        {/* 右侧：搜索 + 头像 */}
        <div className='flex items-center gap-1'>
          <button
            onClick={() => router.push('/search')}
            className='p-2 rounded-full text-ink-secondary hover:text-ink hover:bg-white/10 transition-colors'
            aria-label='搜索'
          >
            <Search className='h-5 w-5' />
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;

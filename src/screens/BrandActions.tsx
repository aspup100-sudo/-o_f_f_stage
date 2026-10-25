import { useMe, guard } from '@/store/hooks';
import { toggleFollow, toggleHeart } from '@/store/actions';
import { Button, Icon, cx } from '@/components/ui';

/** 브랜드 카드 오른쪽 버튼: 방문객은 팔로우, 브랜드는 관심(하트) */
export function BrandActions({ brandId, big }: { brandId: string; big?: boolean }) {
  const { role, visitor, userId, brand } = useMe();
  if (role === 'visitor' && visitor) {
    const on = visitor.following.includes(brandId);
    return (
      <Button size={big ? 'md' : 'sm'} variant={on ? 'secondary' : 'dark'} onClick={() => toggleFollow(userId, brandId)}>
        {on ? '팔로잉' : '팔로우'}
      </Button>
    );
  }
  if (role === 'brand' && brand && brand.id !== brandId) {
    const on = brand.hearts.includes(brandId);
    return (
      <button
        onClick={() => guard(() => toggleHeart(brand.id, brandId))}
        className={cx('rounded-md border flex items-center justify-center shrink-0', big ? 'w-10 h-10' : 'w-9 h-9', on ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-ink-300 text-ink-500')}
        aria-label="관심 표시"
      >
        <Icon name="heart" filled={on} className="w-5 h-5" />
      </button>
    );
  }
  return null;
}

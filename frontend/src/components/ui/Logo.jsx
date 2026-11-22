import Icon from './Icon'

export default function Logo({ size = 'md' }) {
  const box = size === 'lg' ? 'size-9 rounded-[10px]' : 'size-8 rounded-[9px]'
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex items-center justify-center bg-indigo-600 text-white ${box}`}>
        <Icon name="logo" className={size === 'lg' ? 'size-5' : 'size-[18px]'} />
      </span>
      <span className={`font-display font-semibold ${size === 'lg' ? 'text-lg' : 'text-[17px]'}`}>Knowledge Assistant</span>
    </span>
  )
}

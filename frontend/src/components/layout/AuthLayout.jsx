import Logo from '../ui/Logo'

/** Two halves: brand panel (left) and form (right). They stack on small screens, form first. */
export default function AuthLayout({ heading, text, panelFooter, children }) {
  return (
    <div className="flex min-h-dvh flex-col-reverse bg-white lg:flex-row">
      <section className="flex flex-1 flex-col justify-between gap-12 bg-indigo-50 p-8 lg:p-14">
        <Logo size="lg" />
        <div className="flex max-w-[460px] flex-col gap-4">
          <h1 className="font-display text-3xl leading-tight font-semibold lg:text-[40px]">{heading}</h1>
          <p className="text-[17px] leading-relaxed text-slate-600">{text}</p>
        </div>
        {panelFooter}
      </section>
      <section className="flex flex-1 items-center justify-center px-6 py-12 lg:px-8">
        <div className="w-full max-w-[400px]">{children}</div>
      </section>
    </div>
  )
}

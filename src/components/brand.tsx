import Image from "next/image";
import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${inverse ? "brand-inverse" : ""}`}
      aria-label="ProCoderJii home"
    >
      <Image
        src="/logo.png"
        alt=""
        width={36}
        height={36}
        className="brand-mark"
      />
      <span>
        ProCoderJii<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}

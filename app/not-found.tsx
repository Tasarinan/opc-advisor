import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell max-w-md py-24 text-center">
      <h1 className="page-title">页面不存在</h1>
      <p className="mt-2 text-muted-foreground">链接无效，或你没有权限查看该资源。</p>
      <Link className="mt-6 inline-block link-plain" href="/projects">
        返回项目列表
      </Link>
    </main>
  );
}

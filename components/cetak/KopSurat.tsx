import { IconSchool } from "@/components/admin/icons";

export default function KopSurat({
  profil,
  judul,
  subjudul,
}: {
  profil: { nama?: string | null; alamat?: string | null; logoUrl?: string | null } | null;
  judul: string;
  subjudul?: string;
}) {
  return (
    <div className="mb-6 flex items-center justify-between border-b-[3px] border-ink-900 pb-4">
      <div className="flex items-center gap-4">
        {profil?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profil.logoUrl} alt="Logo Sekolah" className="h-16 w-16 object-contain" crossOrigin="anonymous" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-[10px] bg-border-soft">
            <IconSchool className="h-7 w-7 text-ink-500" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-extrabold uppercase tracking-wide text-ink-900">
            {profil?.nama || "NAMA SEKOLAH"}
          </h1>
          <p className="mt-0.5 max-w-[420px] text-xs leading-snug text-ink-500">
            {profil?.alamat || "Alamat sekolah belum diatur di sistem."}
          </p>
        </div>
      </div>
      <div className="text-right">
        <h2 className="text-lg font-bold uppercase tracking-wide text-accent">{judul}</h2>
        {subjudul && <div className="mt-0.5 text-xs text-ink-500">{subjudul}</div>}
      </div>
    </div>
  );
}

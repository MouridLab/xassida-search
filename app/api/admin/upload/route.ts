import { NextResponse } from "next/server";
export function POST() {
  return NextResponse.json(
    { error: "Utilisez le workflow d’upload direct présigné." },
    { status: 410 },
  );
}

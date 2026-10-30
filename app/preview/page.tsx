import { sampleRepoData, excalidrawRepoData } from "@/lib/scaffold/sample-data";
import { deriveCategories } from "@/lib/canvas/categories";
import { CanvasShell } from "@/components/shell/canvas-shell";

interface PreviewPageProps {
  searchParams?: Promise<{ repo?: string }>;
}

/**
 * Preview route that renders real parsed repository data through the three-column interface.
 * 
 * Supports switching between parsed repositories via ?repo=excalidraw or ?repo=trpc.
 * Defaults to excalidraw/excalidraw when testing.
 */
export default async function PreviewPage(props: PreviewPageProps) {
  const searchParams = await props.searchParams;
  const isTrpc = searchParams?.repo === "trpc";
  const activeData = isTrpc ? sampleRepoData : excalidrawRepoData;
  const repositoryName = isTrpc ? "trpc/packages" : "excalidraw/excalidraw";

  const categories = deriveCategories(activeData.files);

  return (
    <CanvasShell
      data={activeData}
      categories={categories}
      repositoryName={repositoryName}
    />
  );
}

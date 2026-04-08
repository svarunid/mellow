import { $ } from "bun";

/**
 * Clone a repository into a temporary directory for stack analysis.
 * Uses the analysis Docker container (alpine + git) to keep the host clean.
 * Returns the path to the cloned repo directory and a cleanup function.
 */
export async function cloneForAnalysis(
	repoUrl: string,
): Promise<{ repoDir: string; cleanup: () => Promise<void> }> {
	const tmpDir = `/tmp/mellow-analysis-${crypto.randomUUID()}`;
	await $`mkdir -p ${tmpDir}`;

	try {
		await $`docker run --rm -v ${tmpDir}:/output mellow/analysis:latest git clone --depth=1 ${repoUrl} /output/repo`;
	} catch (e) {
		await $`rm -rf ${tmpDir}`;
		throw new Error(`Failed to clone repository for analysis: ${e}`);
	}

	return {
		repoDir: `${tmpDir}/repo`,
		cleanup: () => $`rm -rf ${tmpDir}`.then(() => {}),
	};
}

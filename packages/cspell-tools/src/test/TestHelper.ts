import assert from 'assert';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as shell from 'shelljs';
import { fileURLToPath } from 'url';
import { expect } from 'vitest';

const _dirname = test_dirname(import.meta.url);

const packageRoot = path.join(_dirname, '../..');
const repoRoot = path.join(packageRoot, '../..');
const tempDirBase = path.join(packageRoot, 'temp');
const repoSamples = path.join(repoRoot, 'packages/Samples');

export interface TestHelper {
    readonly packageRoot: string;
    readonly repoRoot: string;
    readonly tempDir: string;

    /**
     * delete the contents of the temp directory for the current test.
     */
    clearTempDir(): void;
    /**
     * Resolves the parts to be an absolute path in the temp directory
     * for a given test.
     * @param parts
     */
    resolveTemp(...parts: string[]): string;

    createTempDir(...parts: string[]): void;

    /**
     * Resolves a fixture path to an absolute path
     * @param parts - relative path to fixture
     */
    resolveFixture(...parts: string[]): string;

    /**
     * Resolves a path to an absolute path in Samples
     * @param parts - relative path to sample
     */
    resolveSample(...parts: string[]): string;

    /**
     * Make the temp directory
     * @param parts
     */
    mkdir(...parts: string[]): void;

    /**
     * copy files
     * same as shell.cp
     * @param from
     * @param to
     */
    cp(from: string, to: string): void;

    packageTemp(...parts: string[]): string;

    /**
     * Signal the start of a test.
     * Use to make test.each unique.
     * @param name
     */
    beginTest(name?: string): void;

    getCurrentTestName(): string;

    fileExists(path: string): Promise<boolean>;
}

export function createTestHelper(testFilenameUrl: string): TestHelper {
    testFilenameUrl && assert(testFilenameUrl.startsWith('file:'));
    const testFilename = testFilenameUrl && test_filename(testFilenameUrl);
    return new TestHelperImpl(testFilename || expect.getState().testPath || 'test');
}

const fixtureDir = path.join(packageRoot, 'fixtures');

class TestHelperImpl implements TestHelper {
    readonly packageRoot = packageRoot;
    readonly repoRoot = repoRoot;
    readonly tempDir: string;
    readonly fixtureDir: string;

    private testCounter = new Map<string, number>();

    constructor(testFilename: string) {
        this.tempDir = path.join(tempDirBase, path.relative(packageRoot, testFilename));
        this.fixtureDir = fixtureDir;
    }

    beginTest(): void {
        const currentTestName = this.getRawTestName();
        const prev = this.testCounter.get(currentTestName) || 0;
        this.testCounter.set(currentTestName, prev + 1);
    }

    private getRawTestName(): string {
        return expect.getState().currentTestName || '';
    }

    getCurrentTestName(): string {
        const currentTestName = this.getRawTestName();
        const counter = this.testCounter.get(currentTestName);
        return `${currentTestName}${counter ? ' ' + counter : ''}`;
    }

    /**
     * delete the contents of the temp directory for the current test.
     */
    clearTempDir(): void {
        shell.rm('-rf', this.resolveTemp());
    }

    /**
     * resolve a path relative to the
     * @param parts
     * @returns
     */
    resolveTemp(...parts: string[]): string {
        const currentTestName = this.getCurrentTestName();
        const testName = currentTestName.replace(/[^\w_.-]/g, '_');
        return path.resolve(this.tempDir, testName, ...parts);
    }

    /**
     * make a directory. It is ok to make the same directory multiple times.
     * @param parts
     */
    mkdir(...parts: string[]): void {
        const pTemp = this.resolveTemp(...parts);
        shell.mkdir('-p', pTemp);
    }

    /**
     * Copy files from src to dest
     * @param src - glob
     * @param dest - directory or file
     */
    cp(src: string, dest: string): void {
        shell.cp(this.resolveTemp(src), this.resolveTemp(dest));
    }

    /**
     * resolve a path to the fixtures.
     * @param parts
     * @returns
     */
    resolveFixture(...parts: string[]): string {
        return path.resolve(this.fixtureDir, ...parts);
    }

    resolveSample(...parts: string[]): string {
        return path.resolve(repoSamples, ...parts);
    }

    /**
     * calc a path relative to the package temp directory.
     * @param parts - optional path segments
     * @returns
     */
    packageTemp(...parts: string[]): string {
        return path.resolve(tempDirBase, ...parts);
    }

    readonly createTempDir = this.mkdir;

    async fileExists(path: string): Promise<boolean> {
        try {
            await fs.stat(path);
            return true;
        } catch (e) {
            return false;
        }
    }
}

export function resolvePathToFixture(...segments: string[]): string {
    return path.resolve(fixtureDir, ...segments);
}

export function test_dirname(importMetaUrl: string): string {
    return path.dirname(test_filename(importMetaUrl));
}

export function test_filename(importMetaUrl: string): string {
    return fileURLToPath(importMetaUrl);
}

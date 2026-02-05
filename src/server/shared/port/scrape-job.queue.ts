export interface IScrapeJobQueue {
	add(flatId: number): Promise<void>;
}

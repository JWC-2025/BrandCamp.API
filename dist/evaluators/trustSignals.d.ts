import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
export declare class TrustSignalsEvaluator implements Evaluator {
    name: string;
    private aiService;
    constructor();
    evaluate(websiteData: WebsiteData): Promise<EvaluationResult>;
}

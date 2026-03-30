/**
 * OpenClaw Manager - Instance Templates
 * 8 pre-configured templates for different use cases
 */
import { InstanceTemplate } from './types';
export declare const templates: InstanceTemplate[];
export declare function getTemplate(id: string): InstanceTemplate | undefined;
export declare function getTemplatesByCategory(category: InstanceTemplate['category']): InstanceTemplate[];
export declare function getTemplatesByTag(tag: string): InstanceTemplate[];
//# sourceMappingURL=templates.d.ts.map
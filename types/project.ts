import { z } from 'zod';

export const ProjectSchema = z.object({
    project_id: z.string().describe('Unique identifier for the project'),
    company: z.object({
        legal_name: z.string().describe('Legal name of the company'),
        owners: z.array(z.string()).describe('Array of company owners'),
        employees: z.array(z.string()).describe('Array of company employees')
    }),
    description: z.string().describe('Project description'),
    status: z.string().describe('Current status of the project')
});

export type Project = z.infer<typeof ProjectSchema>;
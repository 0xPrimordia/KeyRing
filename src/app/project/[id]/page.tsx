'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../../../components/Header';

interface Project {
  id: string;
  company_name: string;
  legal_entity_name: string;
  public_record_url: string | null;
  owners: string[] | null;
  topic_message_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ThresholdList {
  id: string;
  list_topic_id: string;
  threshold_account_id: string;
  required_signatures: number;
  total_signers: number;
  status: string;
  created_at: string;
}

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [thresholdLists, setThresholdLists] = useState<ThresholdList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        
        // Fetch project details with threshold lists
        const projectResponse = await fetch(`/api/projects/${resolvedParams.id}`);
        const projectData = await projectResponse.json();
        
        if (projectData.success) {
          setProject(projectData.project);
          setThresholdLists(projectData.project.keyring_threshold_lists || []);
          setError(null);
        } else {
          setError(projectData.error || 'Failed to load project');
        }
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
            <span className="text-gray-400">Loading project...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <span className="text-red-400">{error || 'Project not found'}</span>
            <div className="mt-4">
              <Link href="/" className="text-primary hover:text-primary-dark">
                ← Back to Registry
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const NETWORK = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  const explorerBase = NETWORK === 'mainnet' 
    ? 'https://hashscan.io/mainnet' 
    : 'https://hashscan.io/testnet';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-primary transition-colors">
            ← Back to Registry
          </Link>
        </div>

        {/* Project Header */}
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{project.company_name}</h1>
              <p className="text-gray-400 text-lg">{project.legal_entity_name}</p>
            </div>
            {project.topic_message_id && (
              <span className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                ✓ Registered On-Chain
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Owners */}
            {project.owners && project.owners.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Project Owners</h3>
                <div className="flex flex-wrap gap-2">
                  {project.owners.map((owner, idx) => (
                    <span key={idx} className="inline-flex items-center px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded-lg border border-gray-600">
                      {owner}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Registration Date */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Registration Date</h3>
              <p className="text-foreground">{new Date(project.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>

            {/* Public Records */}
            {project.public_record_url && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Public Records</h3>
                <a 
                  href={project.public_record_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Government Records
                </a>
              </div>
            )}

            {/* HCS-2 Topic Message */}
            {project.topic_message_id && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">On-Chain Registration</h3>
                <a 
                  href={`${explorerBase}/transaction/${project.topic_message_id}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark transition-colors flex items-center font-mono text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  View on HashScan
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Threshold Lists Section */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700">
          <div className="px-8 py-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Threshold Lists</h2>
              <span className="text-sm text-gray-400">
                {thresholdLists.length} {thresholdLists.length === 1 ? 'list' : 'lists'}
              </span>
            </div>
          </div>
          <div className="p-8">
            {thresholdLists.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-gray-400">No threshold lists created yet for this project</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {thresholdLists.map((list) => (
                  <div key={list.id} className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <Link 
                        href={`/list/${list.id}`} 
                        className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        List #{list.threshold_account_id.split('.').pop()}
                      </Link>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        list.status === 'active' 
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                          : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                      }`}>
                        {list.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Account ID:</span>
                        <span className="text-foreground font-mono text-xs">{list.threshold_account_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Threshold:</span>
                        <span className="text-foreground">{list.required_signatures} of {list.total_signers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Created:</span>
                        <span className="text-foreground">{new Date(list.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <a 
                        href={`${explorerBase}/account/${list.threshold_account_id}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:text-primary-dark transition-colors flex items-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View on HashScan
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


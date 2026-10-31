/** Single definition of the Pocket Brain embedder, shared by the Build Brain and the browser worker. */
export const EMBEDDER = {
  id: 'Xenova/all-MiniLM-L6-v2',
  revision: '751bff37182d3f1213fa05d7196b954e230abad9',
  dtype: 'q8' as const,
  dims: 384,
  approxDownloadMB: 23,
  license: 'Apache-2.0',
};

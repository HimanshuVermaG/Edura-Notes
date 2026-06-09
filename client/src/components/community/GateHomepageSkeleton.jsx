import React from 'react';

export default function GateHomepageSkeleton() {
  return (
    <div className="container py-4">
      {/* Header Skeleton */}
      <div className="mb-5 text-center text-md-start">
        <div className="edura-skeleton edura-skeleton-text mb-3 mx-auto mx-md-0" style={{ width: '250px', height: '40px' }}></div>
        <div className="edura-skeleton edura-skeleton-text mx-auto mx-md-0" style={{ width: '100%', maxWidth: '600px' }}></div>
        <div className="edura-skeleton edura-skeleton-text mx-auto mx-md-0 mt-2" style={{ width: '80%', maxWidth: '480px' }}></div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="card shadow-sm border-0 p-4 mb-5 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4" style={{ background: 'var(--edura-card-bg)', border: '1px solid var(--edura-border)' }}>
        <div className="edura-skeleton rounded" style={{ height: '40px', width: '100%', maxWidth: '500px' }}></div>
        <div className="d-flex gap-2">
          <div className="edura-skeleton rounded" style={{ width: '60px', height: '32px' }}></div>
          <div className="edura-skeleton rounded" style={{ width: '80px', height: '32px' }}></div>
          <div className="edura-skeleton rounded" style={{ width: '70px', height: '32px' }}></div>
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="mb-5">
        <div className="edura-skeleton edura-skeleton-text mb-4" style={{ width: '200px', height: '28px' }}></div>
        <div className="row g-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="col-12 col-md-6 col-lg-4">
              <div className="edura-card p-0 overflow-hidden border h-100 d-flex flex-column" style={{ borderColor: 'var(--edura-border)', background: 'var(--edura-card-bg)' }}>
                <div className="edura-skeleton" style={{ height: '80px', width: '100%', borderRadius: '0' }}></div>
                <div className="card-body p-4 pt-0 d-flex flex-column flex-grow-1 position-relative">
                  <div className="position-absolute top-0 start-0 ms-4 translate-middle-y edura-skeleton rounded-3 border border-edura" style={{ width: '56px', height: '56px', background: 'var(--edura-bg)' }}></div>
                  
                  <div className="mt-4 pt-2 mb-2">
                    <div className="edura-skeleton edura-skeleton-text" style={{ width: '60%' }}></div>
                  </div>
                  <div className="edura-skeleton edura-skeleton-text-sm mt-2" style={{ width: '100%' }}></div>
                  <div className="edura-skeleton edura-skeleton-text-sm mt-1" style={{ width: '80%' }}></div>
                  
                  <div className="d-flex align-items-center justify-content-between pt-3 border-top mt-auto">
                    <div className="d-flex gap-3">
                       <div className="edura-skeleton rounded" style={{ width: '40px', height: '20px' }}></div>
                       <div className="edura-skeleton rounded" style={{ width: '40px', height: '20px' }}></div>
                    </div>
                    <div className="edura-skeleton rounded" style={{ width: '60px', height: '30px' }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

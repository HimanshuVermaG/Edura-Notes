import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

import GateHomepageGrid from "../components/community/GateHomepageGrid";
import GateCommunityDetail from "../components/community/GateCommunityDetail";
import ContributeModal from "../components/community/ContributeModal";
import SecureNoteModal from "../components/community/SecureNoteModal";
import Layout from "../components/Layout";

export default function Community() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [spaces, setSpaces] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Compute navigation states directly from URL to fix back button behavior
  const spaceId = searchParams.get('space');
  const noteId = searchParams.get('note');

  const selectedSubject = React.useMemo(() => {
    if (!spaceId) return null;
    return spaces.find(s => s.id === spaceId) || null;
  }, [spaces, spaceId]);

  const selectedNote = React.useMemo(() => {
    if (!selectedSubject || !noteId) return null;
    let foundNote = null;
    selectedSubject.topics?.forEach(t => {
      const n = (t.notes || []).find(x => (x._id || x.id) === noteId);
      if (n) foundNote = n;
    });
    return foundNote;
  }, [selectedSubject, noteId]);
  
  // High-level UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  
  // Local storage states for joining/bookmarking
  const [bookmarks, setBookmarks] = useState([]);
  const [joinedSpaces, setJoinedSpaces] = useState([]);

  const bookmarksKey = user ? `community_bookmarks_${user._id}` : "community_bookmarks";
  const joinedSpacesKey = user ? `cp_joined_spaces_${user._id}` : "cp_joined_spaces";

  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem(bookmarksKey);
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
      else setBookmarks([]);

      const storedJoined = localStorage.getItem(joinedSpacesKey);
      if (storedJoined) setJoinedSpaces(JSON.parse(storedJoined));
      else setJoinedSpaces([]);
    } catch (e) {
      console.error("Could not read localstorage:", e);
    }
  }, [bookmarksKey, joinedSpacesKey]);

  const fetchSpaces = () => {
    setLoading(true);
    Promise.all([
      api('/community-spaces'),
      api('/community-spaces/top-contributors').catch(() => []) // fail gracefully
    ])
      .then(([spacesData, contributorsData]) => {
        setSpaces(spacesData);
        setTopContributors(contributorsData || []);
        
        if (user) {
          const actualJoined = spacesData.filter(s => s.members.includes(user._id)).map(s => s.id);
          setJoinedSpaces(actualJoined);
          localStorage.setItem(joinedSpacesKey, JSON.stringify(actualJoined));
        }

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  // Remove legacy manual URL syncing since we derive state directly from URL

  const toggleBookmark = (noteId) => {
    let nextBookmarks;
    if (bookmarks.includes(noteId)) {
      nextBookmarks = bookmarks.filter(id => id !== noteId);
    } else {
      nextBookmarks = [...bookmarks, noteId];
    }
    setBookmarks(nextBookmarks);
    localStorage.setItem(bookmarksKey, JSON.stringify(nextBookmarks));
  };

  const toggleJoinSpace = async (spaceId) => {
    let nextJoined;
    if (joinedSpaces.includes(spaceId)) {
      nextJoined = joinedSpaces.filter(id => id !== spaceId);
    } else {
      nextJoined = [...joinedSpaces, spaceId];
    }
    setJoinedSpaces(nextJoined);
    localStorage.setItem(joinedSpacesKey, JSON.stringify(nextJoined));

    try {
      const res = await api(`/community-spaces/${spaceId}/toggle-join`, { method: 'POST' });
      setSpaces(prev => prev.map(s => {
        if (s.id === spaceId) {
          return { ...s, membersCount: res.membersCount, members: res.isJoined ? [...s.members, user._id] : s.members.filter(id => id !== user._id) };
        }
        return s;
      }));
      // No need to update selectedSubject manually anymore since it's derived from `spaces` array
      // which is updated via setSpaces above.
    } catch (err) {
      console.error(err);
      // Revert on error
      fetchSpaces();
    }
  };

  const handleSelectSpace = (space) => {
    const params = new URLSearchParams(searchParams);
    params.set('space', space.id);
    setSearchParams(params);
  };

  const handleSelectNote = (note) => {
    const params = new URLSearchParams(searchParams);
    params.set('note', note._id || note.id);
    setSearchParams(params);
  };

  const handleCloseNote = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('note');
    setSearchParams(params);
  };

  const handleBackToGrid = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('space');
    params.delete('note');
    setSearchParams(params);
    setSearchQuery("");
  };

  // Derive notes count for grid
  const notesCountBySpace = {};
  spaces.forEach(s => {
    let count = 0;
    if (s.topics) {
      s.topics.forEach(t => count += (t.notes ? t.notes.length : 0));
    }
    notesCountBySpace[s.id] = count;
  });

  if (loading) {
    return <div className="p-5 text-center text-muted h-100 d-flex align-items-center justify-content-center">Loading community spaces...</div>;
  }

  return (
    <Layout>
      <div className="d-flex flex-column min-vh-100" style={{ background: 'var(--edura-bg)' }}>


        <div className="flex-grow-1 d-flex position-relative">
          
          <main className="flex-grow-1 min-w-0 position-relative w-100 overflow-x-hidden">
            
            {!selectedSubject ? (
              // 1. HOMEPAGE VIEW
              <GateHomepageGrid 
                spaces={spaces}
                topContributors={topContributors}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                onSelectSpace={handleSelectSpace}
                joinedSpaces={joinedSpaces}
                toggleJoinSpace={toggleJoinSpace}
                notesCountBySpace={notesCountBySpace}
              />
            ) : (
              // 2. COMMUNITY DETAIL VIEW
              <GateCommunityDetail 
                space={selectedSubject}
                onBack={handleBackToGrid}
                isJoined={joinedSpaces.includes(selectedSubject.id)}
                toggleJoinSpace={toggleJoinSpace}
                onContribute={() => setContributeModalOpen(true)}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                handleSelectNote={handleSelectNote}
                currentUser={user}
                refreshSpaces={fetchSpaces}
              />
            )}

          </main>
          
        </div>
      </div>

      <ContributeModal 
        isOpen={contributeModalOpen} 
        onClose={() => setContributeModalOpen(false)} 
        selectedSubject={selectedSubject}
      />

      <SecureNoteModal 
        isOpen={!!selectedNote}
        onClose={handleCloseNote}
        note={selectedNote}
        currentUser={user}
      />
    </Layout>
  );
}

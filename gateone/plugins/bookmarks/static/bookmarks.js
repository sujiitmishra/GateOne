(function(window, undefined) {
var document = window.document; // Have to do this because we're sandboxed

"use strict";

// Useful sandbox-wide stuff
var noop = GateOne.Utils.noop;
var months = {
    '0': 'JAN',
    '1': 'FEB',
    '2': 'MAR',
    '3': 'APR',
    '4': 'MAY',
    '5': 'JUN',
    '6': 'JUL',
    '7': 'AUG',
    '8': 'SEP',
    '9': 'OCT',
    '10': 'NOV',
    '11': 'DEC'
}
// Sandbox-wide shortcuts for each log level (actually assigned in init())
var logFatal = noop;
var logError = noop;
var logWarning = noop;
var logInfo = noop;
var logDebug = noop;

// GateOne.Bookmarks (bookmark management functions)
GateOne.Base.module(GateOne, "Bookmarks", "0.9", ['Base']);
GateOne.Bookmarks.bookmarks = [];
GateOne.Bookmarks.tags = [];
GateOne.Bookmarks.sortToggle = false;
GateOne.Bookmarks.searchFilter = null;
GateOne.Bookmarks.page = 0; // Used to tracking pagination
GateOne.Bookmarks.dateTags = [];
GateOne.Bookmarks.toUpload = []; // Used for tracking what needs to be uploaded to the server
GateOne.Bookmarks.loginSync = true; // Makes sure we don't display "Synchronization Complete" if the user just logged in (unless it is the first time).
GateOne.Bookmarks.temp = ""; // Just a temporary holding space for things like drag & drop
GateOne.Base.update(GateOne.Bookmarks, {
    // TODO: Add auto-tagging bookmarks based on date of last login...  <1day, <7days, etc
    // TODO: Make it so you can have a bookmark containing multiple URLs.  So they all get opened at once when you open it.
    init: function() {
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            goDiv = u.getNode(go.prefs.goDiv),
            toolbarBookmarks = u.createElement('div', {'id': go.prefs.prefix+'icon_bookmarks', 'class': 'toolbar', 'title': "Bookmarks"}),
            toolbar = u.getNode('#'+go.prefs.prefix+'toolbar');
        // Assign our logging function shortcuts if the Logging module is available with a safe fallback
        if (go.Logging) {
            logFatal = go.Logging.logFatal;
            logError = go.Logging.logError;
            logWarning = go.Logging.logWarning;
            logInfo = go.Logging.logInfo;
            logDebug = go.Logging.logDebug;
        }
        // Default sort order is by date created, descending, followed by alphabetical order
        if (!localStorage[prefix+'sort']) {
            // Set a default
            localStorage[prefix+'sort'] = 'date';
            b.sortfunc = b.sortFunctions.created;
        } else {
            if (localStorage[prefix+'sort'] == 'alpha') {
                b.sortfunc = b.sortFunctions.alphabetical;
            } else if (localStorage[prefix+'sort'] == 'date') {
                b.sortfunc = b.sortFunctions.created;
            } if (localStorage[prefix+'sort'] == 'visits') {
                b.sortfunc = b.sortFunctions.visits;
            }
        }
        // Setup our toolbar icons and actions
        go.Icons['bookmark'] = '<svg xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="17.117" width="18" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><defs><linearGradient id="linearGradient15649" y2="545.05" gradientUnits="userSpaceOnUse" x2="726.49" y1="545.05" x1="748.51"><stop class="stop1" offset="0"/><stop class="stop4" offset="1"/></linearGradient></defs><metadata><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g transform="matrix(0.81743869,0,0,0.81743869,-310.96927,-428.95367)"><polygon points="726.49,542.58,734.1,541.47,737.5,534.58,740.9,541.47,748.51,542.58,743,547.94,744.3,555.52,737.5,551.94,730.7,555.52,732,547.94" fill="url(#linearGradient15649)" transform="translate(-346.07093,-9.8266745)"/></g></svg>';
        toolbarBookmarks.innerHTML = go.Icons['bookmark'];
        // This is the favicon that gets used for SSH URLs (used by updateIcon())
        go.Icons['ssh'] = 'data:image/x-icon;base64,AAABAAIABQkAAAEAIAAAAQAAJgAAABAQAAABAAgAaAUAACYBAAAoAAAABQAAABIAAAABACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////SP///0j///9I////SP///w////8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A+AAAAPgAAAD4AAAA+AAAAPgAAAD4AAAA+AAAAPgAAAD4AAAAKAAAABAAAAAgAAAAAQAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACcnJwAoKSkAKikpACorKgArKysAKywrACwtLAAtLi0ALi4tAC0uLgAuLy4ALi8vAC8wLwAwMC8AMDAwADAxMAAxMjAAMTIxADIzMQAyMzIAMjMzADI0MgAyNDMAMzQ0ADQ0NAAzNTQANDU0ADQ2NAA0NjUANTY1ADU2NgA1NzUANjc2ADY3NwA3ODcANjg4ADc5NwA3OTgAODk4ADg5OQA4OjkAOTo5ADk6OgA5OzoAOjs6ADo7OwA6PDsAOzw7ADw9PAA8PjwAPD49ADw+PgA9Pz4APT8/AD1APgA/QD8AP0E/AEBBQQBAQkAAQEJBAEFCQQBBQ0IAQkRCAEJEQwBDRUMAREZFAEZIRwBGSUYAR0lHAEdKSABHSkkASEtJAElMSgBKTUsAS05MAE5QTwBnaGcAkXBUAG1wbgB+f34AgoOCAMOLWgDQlmMAj5CQAJCRkQChoqEAsrOyALO0swC3t7cAvL29AL29vQC+v74AxcXFAMbGxgDHx8cAyMjIAMrKygDLy8sAzMzMAM3NzQDOzs4Az8/PANHR0QDS0tIA1NTUANbW1gDb29sA39/fAOTk5ADo6OgA6enpAO3t7QDv7+8A8fHxAP///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABzc3Nzc3Nzc3Nzc3Nzc3Nzc1xoaGhoaGhoaGhoaGhac3NlNjEtJiEYEQ0IBQIAXXNzZDk0MC4kHxcRDAcEAV1zc2M9ODRPKSQdFBALBgNdc3NiQExVW1AoIhsVDwoGXnNzYUE/O1NXLighGRMOCV9zc2FDS1ZYNDAsJh0aEgxgc3NhRk5XNDQ0LyojHBYRYnNzYUhFVFlUODMvKCEcFGVzc2FKR0RUQDw3MiwnIBpmc3NhSklHQkE+OjUyKyUeZ3NzaGZpamtsbW9wbmxramhzc2hNcnJycnJycnJycmhNc3NRYWFhYXFRUVFRUVFRUXNzUVFRUVFRUVFRUVFRUlJz//8AAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAA==';
        var showBookmarks = function() {
            go.Visual.togglePanel('#'+prefix+'panel_bookmarks');
        }
        toolbarBookmarks.onclick = showBookmarks;
        // Stick it on the end (can go wherever--unlike GateOne.Terminal's icons)
        toolbar.appendChild(toolbarBookmarks);
        // Initialize the localStorage['bookmarks'] if it doesn't exist
        if (!localStorage[prefix+'bookmarks']) {
            localStorage[prefix+'bookmarks'] = "[]"; // Init as empty JSON list
        } else {
            // Load them into GateOne.Bookmarks.bookmarks
            b.bookmarks = JSON.parse(localStorage[prefix+'bookmarks']);
        }
        // Default sort order is by visits, descending
        b.createPanel();
        setTimeout(function() {
            // Create or complete the icon fetching queue
            if (!localStorage[prefix+'iconQueue']) {
                localStorage[prefix+'iconQueue'] = "";
            } else {
                b.flushIconQueue();
            }
        }, 3000);
        // Setup a callback that re-draws the bookmarks panel whenever it is opened
        if (!go.Visual.panelToggleCallbacks['in']['#'+prefix+'panel_bookmarks']) {
            go.Visual.panelToggleCallbacks['in']['#'+prefix+'panel_bookmarks'] = {};
        }
        go.Visual.panelToggleCallbacks['in']['#'+prefix+'panel_bookmarks']['createPanel'] = b.createPanel;
        // Setup a callback that synchronizes the user's bookmarks after they login
        go.User.userLoginCallbacks.push(function(username) {
            var USN = localStorage[prefix+'USN'] || 0;
            u.xhrGet(go.prefs.url+'bookmarks/sync?updateSequenceNum='+USN, b.syncBookmarks);
        });
    },
    sortFunctions: {
        visits: function(a,b) {
            // Sorts bookmarks according to the number of visits followed by alphabetical
            if (a.visits === b.visits) {
                var x = a.name.toLowerCase(), y = b.name.toLowerCase();
                return x < y ? -1 : x > y ? 1 : 0;
            }
            if (a.visits > b.visits) {
                return -1;
            }
            if (a.visits < b.visits) {
                return 1;
            }
        },
        created: function(a,b) {
            // Sorts bookmarks by date modified followed by alphabetical
            if (a.created === b.created) {
                var x = a.name.toLowerCase(), y = b.name.toLowerCase();
                return x < y ? -1 : x > y ? 1 : 0;
            }
            if (a.created > b.created) {
                return -1;
            }
            if (a.created < b.created) {
                return 1;
            }
        },
        alphabetical: function(a,b) {
            var x = a.name.toLowerCase(), y = b.name.toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
        }
    },
    storeBookmarks: function(bookmarks, /*opt*/recreatePanel, skipTags) {
        // Takes an array of bookmarks and stores them in both GateOne.Bookmarks.bookmarks
        // If *recreatePanel* is true, the panel will be re-drawn after bookmarks are stored.
        // If *skipTags* is true, bookmark tags will be ignored when saving the bookmark object.
        var go = GateOne,
            prefix = go.prefs.prefix,
            b = go.Bookmarks,
            count = 0;
        bookmarks.forEach(function(bookmark) {
            count += 1;
            var conflictingBookmark = false,
                deletedBookmark = false;
            // Add a trailing slash to URLs like http://liftoffsoftware.com
            if (bookmark.url.slice(0,4) == "http" && bookmark.url.indexOf('/', 7) == -1) {
                bookmark.url += '/';
            }
            // Check if this is our "Deleted Bookmarks" bookmark
            if (bookmark.url == "web+deleted:bookmarked.us/") {
                // Write the contained URLs to localStorage
                deletedBookmark = true;
            }
            // Add a "Untagged" tag if tags is empty
            if (!bookmark.tags.length) {
                bookmark.tags = ['Untagged'];
            }
            b.bookmarks.forEach(function(storedBookmark) {
                if (storedBookmark.url == bookmark.url) {
                    // There's a conflict
                    conflictingBookmark = storedBookmark;
                }
            });
            if (conflictingBookmark) {
                if (parseInt(conflictingBookmark.updated) < parseInt(bookmark.updated)) {
                    // Server is newer; overwrite it
                    if (skipTags) {
                        bookmark.tags = conflictingBookmark.tags; // Use the old ones
                    }
                    b.createOrUpdateBookmark(bookmark);
                } else if (parseInt(conflictingBookmark.updateSequenceNum) < parseInt(bookmark.updateSequenceNum)) {
                    // Server isn't newer but it has a higher USN.  So just update this bookmark's USN to match
                    b.updateUSN(bookmark);
                    conflictingBookmark.updateSequenceNum = bookmark.updateSequenceNum;
                    if (bookmark.updateSequenceNum > parseInt(localStorage[prefix+'USN'])) {
                        // Also need to add it to toUpload
                        b.toUpload.push(conflictingBookmark);
                    }
                }
            } else if (deletedBookmark) {
                // Don't do anything
            } else {
                // No conflict; store it if we haven't already deleted it
                var deletedBookmarks = localStorage[prefix+'deletedBookmarks'];
                if (deletedBookmarks) {
                    var existing = JSON.parse(deletedBookmarks),
                        found = false;
                    existing.forEach(function(obj) {
                        if (obj.url == bookmark.url) {
                            if (!obj.deleted > bookmark.updated) {
                                found = true;
                            }
                        }
                    });
                    if (!found) {
                        b.createOrUpdateBookmark(bookmark);
                    }
                } else {
                    b.createOrUpdateBookmark(bookmark);
                }
            }
        });
        if (recreatePanel) {
            b.createPanel();
        }
        b.flushIconQueue();
        return count;
    },
    syncComplete: function(response) {
        // Called when the initial sync (download) is completed, uploads any pending changes.
        logDebug('syncComplete()');
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            responseObj = JSON.parse(response);
        clearInterval(b.syncTimer);
        if (responseObj['updateSequenceNum']) {
            localStorage[prefix+'USN'] = parseInt(responseObj['updateSequenceNum']);
        }
        if (responseObj['errors'].length == 0) {
            go.Visual.displayMessage("Synchronization Complete: " + (responseObj['count']) + " bookmarks were updated.");
            if (responseObj['updates'].length) {
                // The 'updates' list will include the bookmarks that have been updated so we can update their "updated" and "USN" attributes on the client
                b.storeBookmarks(responseObj['updates'], true, true);
            }
        } else {
            go.Visual.displayMessage("Synchronization Complete (With Errors): " + (responseObj['count']) + " bookmarks were updated successfully.");
            // TODO: Log the errors (guess I need the logging module after all!)
            go.Visual.displayMessage("See the log (Options->View Log) for details.");
            logError("Synchronization Errors: " + u.items(responseObj['errors'][0]));
            b.createPanel();
        }
        u.getNode('#'+prefix+'bm_sync').innerHTML = "Sync Bookmarks | ";
        b.toUpload = []; // Reset it
    },
    syncBookmarks: function(response) {
        logDebug('syncBookmarks() response: ' + response + ', response.length: ' + response.length);
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            firstTime = false,
            bookmarks = null,
            foundDeleted = false,
            localDiff = [],
            remoteDiff = [];
        if (!localStorage[prefix+'deletedBookmarks']) {
            // If it isn't present as an empty array it can break things.
            localStorage[prefix+'deletedBookmarks'] = "[]";
        }
        if (!b.bookmarks.length) {
            firstTime = true;
        }
        bookmarks = JSON.parse(response);
        // Process deleted bookmarks before anything else
        bookmarks.forEach(function(bookmark) {
            if (bookmark.url == 'web+deleted:bookmarks/') {
                foundDeleted = true;
                var deletedBookmarksLocal = JSON.parse(localStorage[prefix+'deletedBookmarks']),
                    deletedBookmarksServer = JSON.parse(bookmark.notes);
                // Figure out the differences
                for (var i in deletedBookmarksLocal) {
                    var found = false;
                    for (var n in deletedBookmarksServer) {
                        if (deletedBookmarksLocal[i].url == deletedBookmarksServer[n].url) {
                            found = true;
                        }
                    }
                    if (!found) {
                        // We need to send these to the server for processing
                        localDiff.push(deletedBookmarksLocal[i]);
                    }
                }
                for (var i in deletedBookmarksServer) {
                    var found = false;
                    for (var n in deletedBookmarksLocal) {
                        if (deletedBookmarksServer[i].url == deletedBookmarksLocal[n].url) {
                            found = true;
                        }
                    }
                    if (!found) {
                        // We need to process these locally
                        remoteDiff.push(deletedBookmarksServer[i]);
                    }
                }
                if (localDiff.length) {
                    b.syncDeletedBookmarks(localDiff);
                }
                if (remoteDiff.length) {
                    for (var i in remoteDiff) {
                        var callback = function() {
                            // This is so we don't endlessly sync deleted bookmarks.
                            localStorage[prefix+'deletedBookmarks'] = "[]";
                        }
                        b.deleteBookmark(remoteDiff[i].url, callback);
                    }
                }
                // Fix the USN if the deletedBookmark note has the highest USN
                if (parseInt(localStorage[prefix+'USN']) < bookmark.updateSequenceNum) {
                    localStorage[prefix+'USN'] = JSON.parse(bookmark.updateSequenceNum);
                }
            }
        });
        // Remove any deleted bookmarks from the array
        for (var i in bookmarks) {
            for (var n in remoteDiff) {
                if (bookmarks[i].url == remoteDiff[n].url) {
                    bookmarks.splice(i, 1);
                }
            }
        }
        if (!foundDeleted) {
            // Have to upload our deleted bookmarks list (if any)
            var deletedBookmarks = JSON.parse(localStorage[prefix+'deletedBookmarks']);
            if (deletedBookmarks.length) {
                b.syncDeletedBookmarks(deletedBookmarks);
            }
        }
        setTimeout(function() {
            var count = b.storeBookmarks(bookmarks, false),
                xhr = new XMLHttpRequest(),
                handleStateChange = function(e) {
                    var status = null;
                    try {
                        status = parseInt(e.target.status);
                    } catch(e) {
                        return;
                    }
                    if (e.target.readyState == 4) {
                        if (status == 200) {
                            logDebug('syncBookmarks() response text: ' + e.target.responseText);
                            b.syncComplete(e.target.responseText);
                        } else {
                            logError('syncBookmarks() error response: ' + u.items(e.target));
                        }
                    }
                };
            // This checks if there are new/imported bookmarks
            b.bookmarks.forEach(function(bookmark) {
                if (bookmark.updateSequenceNum == 0) { // A USN of 0 means it isn't on the server at all or needs to be synchronized
                    // Mark it for upload
                    b.toUpload.push(bookmark);
                }
            });
            // If there *are* new/imported bookmarks, upload them:
            if (b.toUpload.length) {
                xhr.addEventListener('readystatechange', handleStateChange, false);
                xhr.open('POST', go.prefs.url+'bookmarks/sync', true);
                xhr.setRequestHeader("Content-Type", "application/octet-stream");
                xhr.send(JSON.stringify(b.toUpload));
            } else {
                clearTimeout(b.syncTimer);
                if (!firstTime) {
                    if (!JSON.parse(localStorage[prefix+'deletedBookmarks']).length) {
                        // Only say we're done if the deletedBookmarks queue is empty
                        // Otherwise let the syncDeletedBookmarks function take care of it =)
                        if (!b.loginSync) {
                            // This lets us turn off the "Synchronization Complete" message when the user had their bookmarks auto-sync after login
                            go.Visual.displayMessage("Synchronization Complete");
                        }
                    }
                    if (localStorage[prefix+'iconQueue'].length) {
                        go.Visual.displayMessage("Missing bookmark icons will be retrieved in the background");
                    }
                    if (b.highestUSN() > parseInt(localStorage[prefix+'USN'])) {
                        localStorage[prefix+'USN'] = b.highestUSN();
                    }
                } else {
                    go.Visual.displayMessage("First-Time Synchronization Complete");
                    go.Visual.displayMessage("Missing bookmark icons will be retrieved in the background");
                    b.createPanel();
                    localStorage[prefix+'USN'] = b.highestUSN();
                }
                u.getNode('#'+prefix+'bm_sync').innerHTML = "Sync Bookmarks | ";
            }
            // Process any pending tag renames
            if (localStorage[prefix+'renamedTags']) {
                var renamedTags = JSON.parse(localStorage[prefix+'renamedTags']),
                    xhr2 = new XMLHttpRequest(),
                    url = go.prefs.url+'bookmarks/renametags',
                    handleStateChange2 = function(e) {
                        var status = null;
                        if (e.target.readyState == 4) {
                            if (parseInt(e.target.status) == 200) {
                                delete localStorage[prefix+'renamedTags'];
                                go.Visual.displayMessage(renamedTags.length + " tags were renamed.");
                            } else {
                                logError('syncBookmarks() error response: ' + u.items(e.target));
                            }
                        }
                    };
                xhr2.addEventListener('readystatechange', handleStateChange2, false);
                xhr2.open('POST', url, true);
                xhr2.setRequestHeader("Content-Type", "application/octet-stream");
                xhr2.send(JSON.stringify(renamedTags));
            }
            b.loginSync = false; // So subsequent synchronizations display the "Synchronization Complete" message
        }, 200);
    },
    syncDeletedBookmarks: function(localDiff) {
        // Handles uploading the bookmarks in localDiff (e.g. [{'url': 'http://whatever/', 'deleted': 1234567890112}])
        var go = GateOne,
            u = go.Utils,
            prefix = go.prefs.prefix,
            xhr = new XMLHttpRequest(),
            url = go.prefs.url+'bookmarks/delete',
            handleStateChange = function(e) {
                var status = null;
                if (e.target.readyState == 4) {
                    if (parseInt(e.target.status) == 200) {
                        localStorage[prefix+'deletedBookmarks'] = "[]";
                        go.Visual.displayMessage("Synchronization Complete");
                        go.Visual.displayMessage(localDiff.length + " bookmarks were deleted or marked as such.");
                    } else {
                        // TODO: Switch this to using a log() function
                            logError('Error synchronizing deleted bookmarks... ' + u.items(e.target));
                    }
                }
            };
        xhr.addEventListener('readystatechange', handleStateChange, false);
        xhr.open('POST', url, true);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.send(JSON.stringify(localDiff));
    },
    loadBookmarks: function(/*opt*/delay) {
        // Loads the user's bookmarks
        // Optionally, a sort function may be supplied that sorts the bookmarks before placing them in the panel.
        // If *ad* is true, an advertisement will be the first item in the bookmarks list
        // If *delay* is given, that will be used to set the delay
        logDebug("loadBookmarks()");
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            goDiv = u.getNode(go.prefs.goDiv),
            prefix = go.prefs.prefix,
            bookmarks = b.bookmarks.slice(0), // Make a local copy since we're going to mess with it
            bmCount = 0, // Starts at 1 for the ad
            bmMax = b.getMaxBookmarks('#'+prefix+'bm_container'),
            bmContainer = u.getNode('#'+prefix+'bm_container'),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            pagination = u.getNode('#'+prefix+'bm_pagination'),
            paginationUL = u.getNode('#'+prefix+'bm_pagination_ul'),
            tagCloud = u.getNode('#'+prefix+'bm_tagcloud'),
            bmSearch = u.getNode('#'+prefix+'bm_search'),
            bmTaglist = u.getNode('#'+prefix+'bm_taglist'),
            cloudTags = u.toArray(tagCloud.getElementsByClassName('bm_tag')),
            allTags = [],
            filteredBookmarks = [],
            bookmarkElements = u.toArray(goDiv.getElementsByClassName('bookmark'));
        bmPanel.style['overflow-y'] = "hidden"; // Only temporary while we're loading bookmarks
        setTimeout(function() {
            bmPanel.style['overflow-y'] = "auto"; // Set it back after everything is loaded
        }, 1000);
        if (bookmarkElements) { // Remove any existing bookmarks from the list
            bookmarkElements.forEach(function(bm) {
                bm.style.opacity = 0;
                setTimeout(function() {
                    u.removeElement(bm);
                },500);
            });
        }
        if (!delay) {
            delay = 0;
        }
        // Remove the pagination UL
        if (paginationUL) {
            u.removeElement(paginationUL);
        };
        // Apply the sort function
        bookmarks.sort(b.sortfunc);
        if (b.sortToggle) {
            bookmarks.reverse();
        }
        if (!bookmarks.length) { // No bookmarks == Likely new user.  Show a welcome message.
            var welcome = {
                    'url': "http://liftoffsoftware.com/",
                    'name': "You don't have any bookmarks yet!",
                    'tags': [],
                    'notes': 'A great way to get started is to import bookmarks or click Sync.',
                    'visits': 0,
                    'updated': new Date().getTime(),
                    'created': new Date().getTime(),
                    'updateSequenceNum': 0,
                    'images': {'favicon': "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sHCBMpEfMvEIMAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAACEUlEQVQoz2M0Lei7f/YIA3FAS02FUcQ2iFtcDi7Ex81poq6ooyTz7cevl+8/nr354Nmb93DZry8fMXPJa7Lx8EP43pYGi2oyIpwt2NlY333+WpcQGO9pw8jAePbm/X///zMwMPz++pEJrrs00ntqUbwQLzcDA8P2Exd3nLzEwMDAwsxcGO6xuCaTmQmqEkqZaSplBjrDNW87cfHinUdwx1jqqKT7O0HYLBAqwcvuzpOXEPb956+fvn7PwMCwfM8JX2tDuGuX7T729SUDCwMDAyc7m5KkaO6ERTcfPUcOk8lrd01eu4uBgUGAh6szM0JPRe7p3RtMDAwMarISGvJSG9sLo1ytMIPSTFNpe0+pu5mulrwU1A+fv/1gYGDgYGNtSwttSApCVu1jZbC8IVtSWICBgeHT1+9QDQ+ev/728xdExYcv35A1vP30BR4+Vx88hWr49///zpOXIKLbT1xkYGDwtNDPD3FnZmI6de3eu89fGRgYHrx4c+3BU0QoNc5fb6On/uX7j4cv3rSlhUI8Y62nlj9x8e7Tl0MdzYunLPv95y8DAwMiaZhqKPnbGplpKqvJSsCd9OHLt3UHT9958nLZnuOQpMEClzt9497Nx8+rYv2E+XiE+XkYGBi+/fx1+e7jpbuP3X36Cq4MPfFBgKSwABcH2/1nryFJCDnxsWipqVy7dQdNw52Xj7Amb0VjGwCOn869WU5D8AAAAABJRU5ErkJggg=="}
            },
                introVideo = {
                'url': "http://vimeo.com/26357093",
                'name': "A Quick Screencast Overview of Bookmarked",
                'tags': ["Video", "Help"],
                'notes': 'Want some help getting started?  Our short (3 minutes) overview screencast can be illuminating.',
                'visits': 0,
                'updated': new Date().getTime(),
                'created': new Date().getTime(),
                'updateSequenceNum': 0,
                'images': {'favicon': "data:image/x-icon;base64,AAABAAEAEBAAAAAAAABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAA8uvRAMq/oQDj28EA27crAOjRdwCrhwoAuZQLAODKdwC6r5EAkXs1AODCSgCKd0MA3rw7AP///wDi3dAA/PnwAI9yFwBzWxUAh2kHAL6aCwDAmgsA6taGAM+nDACwjxkA1q0NANfIkwDt3qQAz8ShAI98RADr6OAAlXUIAO3blQCqk0UAtKeCAOndsgCdewkAzsawAOTcwQDg1rIA2bIcALmlZADbvUkAno5iAPX07wDGt4MA8OCkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQUFBQUFBQUFBQUFBQUABQUGRkZGQcXGRkZGRkZFBQUGRkZGR8MEgYZGRkZGRkUFBkZGRcJDiwrBhkZGRkZFBQZGRkYDg4ODisHGRkZGRQUGRkZKQ4ODg4OHRkZGRkUFBkZGQIODhYBDiwRGRkZFBQZGRUeDg4ZCw4OJQcZGRQUByQKDg4mFxknDg4hGRkUFCotDw4OGigTIg4OHBkZFBQoLg4ODggZIywODgMZGRQUGRkgDhAEGQsODg4bGRkUFBkZGQ0EGRkZBBYFKBkZFBQZGRkZGRkZGRkZGRkZGRQUDRkZGRkZGRkZGRkZGQ0UABQUFBQUFBQUFBQUFBQUAIABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIABAAA="}
            };
            b.createBookmark(bmContainer, welcome, delay, false);
            b.createBookmark(bmContainer, introVideo, delay+100, false);
        }
        // Remove bookmarks from *bookmarks* that don't match the searchFilter (if one is set)
        if (b.searchFilter) {
            bookmarks.forEach(function(bookmark) {
                var bookmarkName = bookmark.name.toLowerCase();
                if (bookmarkName.match(b.searchFilter.toLowerCase())) {
                    filteredBookmarks.push(bookmark);
                }
            });
            bookmarks = filteredBookmarks;
            filteredBookmarks = []; // Have to reset this for use further down
        }
        bmTaglist.innerHTML = ""; // Clear out the tag list
        // Now recreate it...
        if (b.dateTags) {
            for (var i in b.dateTags) {
                var tag = u.createElement('li', {'id': 'bm_autotag'});
                tag.onclick = function(e) {
                    b.removeFilterDateTag(bookmarks, this.innerHTML);
                };
                tag.innerHTML = b.dateTags[i];
                bmTaglist.appendChild(tag);
            }
        }
        if (b.tags) {
            for (var i in b.tags) { // Recreate the tag filter list
                var tag = u.createElement('li', {'id': 'bm_tag'});
                tag.innerHTML = b.tags[i];
                tag.onclick = function(e) {
                    b.removeFilterTag(bookmarks, this.innerHTML);
                };
                bmTaglist.appendChild(tag);
            }
        }
        if (b.tags) {
        // Remove all bookmarks that don't have matching *Bookmarks.tags*
            bookmarks.forEach(function(bookmark) {
                var bookmarkTags = bookmark.tags,
                    allTagsPresent = false,
                    tagCount = 0;
                bookmarkTags.forEach(function(tag) {
                    if (b.tags.indexOf(tag) != -1) { // tag not in tags
                        tagCount += 1;
                    }
                });
                if (tagCount == b.tags.length) {
                    // Add the bookmark to the list
                    filteredBookmarks.push(bookmark);
                }
            });
            bookmarks = filteredBookmarks;
            filteredBookmarks = []; // Have to reset this for use further down
        }
        if (b.dateTags) {
        // Remove from the bookmarks array all bookmarks that don't measure up to *Bookmarks.dateTags*
            bookmarks.forEach(function(bookmark) {
                var dateObj = new Date(parseInt(bookmark.created)),
                    dateTag = b.getDateTag(dateObj),
                    tagCount = 0;
                b.dateTags.forEach(function(tag) {
                    // Create a new Date object that reflects the date tag
                    var dateTagDateObj = new Date(),
                        olderThanYear = false;
                    if (tag == '<1 day') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-1);
                    }
                    if (tag == '<7 days') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-7);
                    }
                    if (tag == '<30 days') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-30);
                    }
                    if (tag == '<60 days') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-60);
                    }
                    if (tag == '<90 days') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-90);
                    }
                    if (tag == '<180 days') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-180);
                    }
                    if (tag == '<1 year') {
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-365);
                    }
                    if (tag == '>1 year') {
                        olderThanYear = true;
                        dateTagDateObj.setDate(parseInt(dateTagDateObj.getDate())-365);
                    }
                    if (!olderThanYear) {
                        if (dateObj > dateTagDateObj) {
                            tagCount += 1;
                        }
                    } else {
                        if (dateObj < dateTagDateObj) {
                            tagCount += 1;
                        }
                    }
                });
                if (tagCount == b.dateTags.length) {
                    // Add the bookmark to the list
                    filteredBookmarks.push(bookmark);
                }
            });
            bookmarks = filteredBookmarks;
            filteredBookmarks = [];
        }
        allTags = b.getTags(bookmarks);
        b.filteredBookmarks = bookmarks; // Need to keep track semi-globally for some things
        if (b.page) {
            var pageBookmarks = null;
            if (bmMax*(b.page+1) < bookmarks.length) {
                pageBookmarks = bookmarks.slice(bmMax*b.page, bmMax*(b.page+1));
            } else {
                pageBookmarks = bookmarks.slice(bmMax*b.page, bookmarks.length-1);
            }
            pageBookmarks.forEach(function(bookmark) {
                if (bmCount < bmMax) {
                    if (!bookmark.images) {
                        logDebug('bookmark missing images: ' + bookmark);
                    }
                    b.createBookmark(bmContainer, bookmark, delay);
                }
                bmCount += 1;
            });
        } else {
            bookmarks.forEach(function(bookmark) {
                if (bmCount < bmMax) {
                    b.createBookmark(bmContainer, bookmark, delay);
                }
                bmCount += 1;
            });
        }
        var bmPaginationUL = b.loadPagination(bookmarks, b.page);
        pagination.appendChild(bmPaginationUL);
        // Hide tags that aren't in the bookmark array
        delay = 100;
        cloudTags.forEach(function hideTag(tagNode) {
            if (allTags.indexOf(tagNode.innerHTML) == -1) { // Tag isn't in the new list of bookmarks
                // Make it appear inactive
                setTimeout(function() {
                    tagNode.className = 'bm_tag sectrans inactive';
                }, delay);
            }
        });
        // Mark tags as active that were previously inactive (if the user just removed a tag from the tag filter)
        delay = 100;
        cloudTags.forEach(function showTag(tagNode) {
            if (allTags.indexOf(tagNode.innerHTML) != -1) { // Tag is in the new list of bookmarks
                // Make it appear active
                setTimeout(function unTrans() {
                    setTimeout(function reClass() {
                        if (tagNode.innerHTML == "Untagged") {
                            tagNode.className = 'bm_tag sectrans untagged';
                        } else if (tagNode.innerHTML == "Searches") {
                            tagNode.className = 'bm_tag sectrans searches';
                        } else {
                            tagNode.className = 'bm_tag sectrans'; // So we don't have slow mouseovers
                        }
                    }, 500);
                }, delay);
            }
        });
    },
    flushIconQueue: function() {
        // Goes through the iconQueue fetching icons until it is empty.
        // If we're already processing the queue, don't do anything when called.
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix;
        if (!b.flushingIconQueue) {
            setTimeout(function() { // Wrapped for async
                b.flushingIconQueue = true;
                if (localStorage[prefix+'iconQueue'].length) {
                    // We have icons to fetch
                    var iconQueue = localStorage[prefix+'iconQueue'].split('\n'),
                        removed = [];
                    b.flushProgress = setInterval(function() {
                        try {
                            var remaining = Math.abs((localStorage[prefix+'iconQueue'].split('\n').length-1) - iconQueue.length);
                            u.updateProgress(prefix+'iconflush', iconQueue.length, remaining, 'Fetching Icons...');
                            if (localStorage[prefix+'iconQueue'].split('\n').length == 1) {
                                clearInterval(b.flushProgress);
                            }
                        } catch(e) {
                            // Something went wrong (bad math)... Stop updating progress
                            clearInterval(b.flushProgress);
                        }
                    }, 1000);
                    for (var i in iconQueue) {
                        // Find the bookmark associated with this URL
                        var bookmark = b.getBookmarkObj(iconQueue[i]);
                        if (bookmark) {
                            if (bookmark.url) {
                                b.updateIcon(bookmark);
                            }
                        } else {
                            // For whatever reason this bookmark doesn't exist anymore.
                            removed.push(iconQueue[i]);
                        }
                    }
                    if (removed.length) {
                        // Remove these from the queue
                        iconQueue = localStorage[prefix+'iconQueue'].split('\n');
                        for (var r in removed) {
                            for (var i in iconQueue) {
                                if (iconQueue[i] == removed[r]) {
                                    iconQueue.splice(i, 1);
                                }
                            }
                        }
                        if (iconQueue.length) {
                            localStorage[prefix+'iconQueue'] = iconQueue.join('\n');
                        } else {
                            localStorage[prefix+'iconQueue'] = "";
                        }
                    }
                }
                b.flushingIconQueue = false;
            }, 100);
        }
    },
    updateIcon: function(bookmark) {
        // Grabs and stores (as a data: URI) the favicon associated with the given bookmark (if any)
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils;
        if (!b.fetchingIcon) {
            if (bookmark.url.slice(0,4) == "http") {
                // This is an HTTP or HTTPS URL.  Fetch it's icon
                var params = 'url=' + bookmark.url,
                    callback = u.partial(b.storeFavicon, bookmark),
                    xhr = new XMLHttpRequest(),
                    handleStateChange = function(e) {
                        var status = null;
                        try {
                            status = parseInt(e.target.status);
                        } catch(e) {
                            return;
                        }
                        if (e.target.readyState == 4) {
                            b.fetchingIcon = false; // All done regardless of what happened
                            callback(e.target.responseText); // storeFavicon will take care of filtering out bad responses
                        }
                    };
                b.fetchingIcon = true;
                if (xhr.addEventListener) {
                    xhr.addEventListener('readystatechange', handleStateChange, false);
                } else {
                    xhr.onreadystatechange = handleStateChange;
                }
                xhr.open('POST', go.prefs.url+'bookmarks/fetchicon', true);
                xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhr.send(params);
            } else {
                // Check if this is an SSH URL and use the SSH icon for it
                if (bookmark.url.slice(0,3) == "ssh") {
                    b.storeFavicon(bookmark, go.Icons['ssh']);
                }
                // Ignore everything else (until we add suitable favicons)
            }
        } else {
            setTimeout(function() {
                b.updateIcon(bookmark);
            }, 50); // Wait a moment and retry
        }
    },
    storeFavicon: function(bookmark, dataURI) {
        // *dataURI* should be pre-encoded data:URI
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            iconQueue = localStorage[prefix+'iconQueue'].split('\n'),
            goDiv = u.getNode(go.prefs.goDiv),
            visibleBookmarks = u.toArray(goDiv.getElementsByClassName('bookmark')),
            removed = null;
        if (u.startsWith("data:", dataURI)) {
            bookmark.images = {'favicon': dataURI};
            b.createOrUpdateBookmark(bookmark);
        }
        for (var i in iconQueue) {
            if (iconQueue[i] == bookmark.url) {
                // Remove it
                removed = iconQueue.splice(i, 1);
            }
        }
        localStorage[prefix+'iconQueue'] = iconQueue.join('\n');
        // TODO:  Get this working...
//         visibleBookmarks.forEach(function(bookmark) {
//             // Update the favicon of this bookmark in-place (if it is visible)
//             var bmURL = bookmark.getElementsByClassName('bm_url');
//             if (bmURL.href == bookmark.url) {
//                 // Add the favicon
//
//             }
//         });
        // Ignore anything else
    },
    updateIcons: function(urls) {
        // Loops over *urls* attempting to fetch and store their respective favicons
        // NOTE: Only used in debugging (not called from anywhere)
        var go = GateOne,
            b = go.Bookmarks;
        urls.forEach(function(url) {
            b.bookmarks.forEach(function(bookmark) {
                if (bookmark.url == url) {
                    b.updateIcon(bookmark);
                }
            });
        });
    },
    createBookmark: function(bmContainer, bookmark, delay, /*opt*/ad) {
        // Creates a new bookmark element and places it in  in bmContainer.  Also returns the bookmark element.
        // *bmContainer* is the node we're going to be placing bookmarks
        // *bookmark* is expected to be a bookmark object
        // *delay* is the amount of milliseconds to wait before translating the bookmark into view
        // Optional: if *ad* is true, will not bother adding tags or edit/delete/share links
        logDebug('createBookmark() bookmark: ' + bookmark.url);
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            twoSec = null,
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            bmStats = u.createElement('div', {'class': 'bm_stats superfasttrans', 'style': {'opacity': 0}}),
            dateObj = new Date(parseInt(bookmark.created)),
            bmElement = u.createElement('div', {'class': 'bookmark halfsectrans', 'name': prefix+'bookmark'}),
            bmLinkFloat = u.createElement('div', {'class': 'linkfloat'}), // So the user can click anywhere on a bookmark to open it
            bmContent = u.createElement('span', {'class': 'bm_content'}),
            bmFavicon = u.createElement('span', {'class': 'bm_favicon'}),
            bmLink = u.createElement('a', {'href': bookmark.url, 'class': 'bm_url', 'tabindex': 2}),
            bmEdit = u.createElement('a', {'class': 'bm_edit'}),
            bmDelete = u.createElement('a', {'class': 'bm_delete'}),
            bmControls = u.createElement('span', {'class': 'bm_controls'}),
            bmDesc = u.createElement('span', {'class': 'bm_desc'}),
            bmVisited = u.createElement('span', {'class': 'bm_visited', 'title': 'Number of visits'}),
            bmTaglist = u.createElement('ul', {'class': 'bm_taglist'});
            bmElement.addEventListener('dragstart', b.handleDragStart, false);
            bmElement.addEventListener('dragenter', b.handleDragEnter, false);
            bmElement.addEventListener('dragover', b.handleDragOver, false);
            bmElement.addEventListener('dragleave', b.handleDragLeave, false);
            bmElement.addEventListener('drop', b.handleDrop, false);
            bmElement.addEventListener('dragend', b.handleDragEnd, false);
        bmEdit.innerHTML = 'Edit |';
        bmDelete.innerHTML = 'Delete';
        bmEdit.onclick = function(e) {
            e.preventDefault();
            b.editBookmark(this);
        }
        bmDelete.onclick = function(e) {
            e.preventDefault();
            b.deleteBookmark(this);
        }
        bmControls.appendChild(bmEdit);
        bmControls.appendChild(bmDelete);
        bmStats.innerHTML = months[dateObj.getMonth()] + '<br />' + dateObj.getDay() + '<br />' + dateObj.getFullYear();
        bmElement.title = bookmark.url;
        if (bookmark.url.indexOf('%s') != -1) {
            // This is a keyword search URL.  Mark it as such.
            bmLink.innerHTML = '<span class="search">Search:</span> ' + bookmark.name;
        } else {
            bmLink.innerHTML = bookmark.name;
        }
        bmLink.onclick = function(e) {
            e.preventDefault();
            b.openBookmark(this.href);
        };
        if (ad) {
            bmLink.innerHTML = "AD: " + bmLink.innerHTML;
            bmDesc.innerHTML = bookmark.notes;
        }
        if (!b.bookmarks.length) {
            // Add the notes if there's no bookmarks since this is just the "Welcome" message
            bmDesc.innerHTML = bookmark.notes;
        }
        if (bookmark.images['favicon']) {
            bmFavicon.innerHTML = '<img align="left" src="' + bookmark['images']['favicon'] + '" width="16" height="16">';
            bmContent.appendChild(bmFavicon);
        }
        bmContent.appendChild(bmLink);
        // The Link Float div sits behind everything but on top of bmElement and allows us to click anywhere to open the bookmark without clobbering the onclick events of tags, edit/delete, etc
        bmElement.appendChild(bmContent);
        bmDesc.innerHTML = bookmark.notes;
        bmContent.appendChild(bmDesc);
        if (!ad && b.bookmarks.length) {
            var bmDateTag = u.createElement('li', {'class': 'bm_autotag'}),
                dateTag = b.getDateTag(dateObj);
            bmVisited.innerHTML = bookmark.visits;
            bmElement.appendChild(bmVisited);
            bmElement.appendChild(bmControls);
            bookmark.tags.forEach(function(tag) {
                var bmTag = u.createElement('li', {'class': 'bm_tag'});
                bmTag.innerHTML = tag;
                bmTag.onclick = function(e) {
                    b.addFilterTag(b.filteredBookmarks, tag);
                };
                bmTaglist.appendChild(bmTag);
            });
            bmDateTag.innerHTML = dateTag;
            bmDateTag.onclick = function(e) {
                b.addFilterDateTag(b.filteredBookmarks, dateTag);
            };
            bmTaglist.appendChild(bmDateTag);
            bmElement.appendChild(bmTaglist);
        }
        bmElement.appendChild(bmLinkFloat);
        bmLinkFloat.onclick = function(e) {
            b.openBookmark(bmLink.href);
        }
        bmElement.style.opacity = 0;
        setTimeout(function() {
            bmElement.style.opacity = 1;
        }, 500);
        try {
            bmContainer.appendChild(bmElement);
        } catch(e) {
            u.noop(); // Sometimes bmContainer will be missing between page loads--no biggie
        }
        setTimeout(function() {
            try {
                go.Visual.applyTransform(bmElement, '');
            } catch(e) {
                u.noop(); // Bookmark element was removed already.  No biggie.
            }
        }, delay);
        delay += 50;
        return bmElement;
    },
    createSortOpts: function() {
        // Returns a div containing bm_display_opts representing the user's current settings.
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            bmSortOpts = u.createElement('span', {'id': prefix+'bm_sort_options'}),
            bmSortAlpha = u.createElement('a', {'id': prefix+'bm_sort_alpha'}),
            bmSortDate = u.createElement('a', {'id': prefix+'bm_sort_date'}),
            bmSortVisits = u.createElement('a', {'id': prefix+'bm_sort_visits'}),
            bmSortDirection = u.createElement('div', {'id': prefix+'bm_sort_direction'});
        bmSortAlpha.innerHTML = 'Alphabetical ';
        bmSortDate.innerHTML = 'Date ';
        bmSortVisits.innerHTML = 'Visits ';
        bmSortDirection.innerHTML = '▼';
        bmSortOpts.innerHTML = '<b>Sort:</b> ';
        if (localStorage[prefix+'sort'] == 'alpha') {
            bmSortAlpha.className = 'active';
        } else if (localStorage[prefix+'sort'] == 'date') {
            bmSortDate.className = 'active';
        } else if (localStorage[prefix+'sort'] == 'visits') {
            bmSortVisits.className = 'active';
        }
        bmSortAlpha.onclick = function(e) {
            if (localStorage[prefix+'sort'] != 'alpha') {
                b.sortfunc = b.sortFunctions.alphabetical;
                u.getNode('#'+prefix+'bm_sort_' + localStorage[prefix+'sort']).className = null;
                u.getNode('#'+prefix+'bm_sort_alpha').className = 'active';
                b.loadBookmarks();
                localStorage[prefix+'sort'] = 'alpha';
            }
        }
        bmSortDate.onclick = function(e) {
            if (localStorage[prefix+'sort'] != 'date') {
                b.sortfunc = b.sortFunctions.created;
                u.getNode('#'+prefix+'bm_sort_' + localStorage[prefix+'sort']).className = null;
                u.getNode('#'+prefix+'bm_sort_date').className = 'active';
                b.loadBookmarks();
                localStorage[prefix+'sort'] = 'date';
            }
        }
        bmSortVisits.onclick = function(e) {
            if (localStorage[prefix+'sort'] != 'visits') {
                b.sortfunc = b.sortFunctions.visits;
                u.getNode('#'+prefix+'bm_sort_' + localStorage[prefix+'sort']).className = null;
                u.getNode('#'+prefix+'bm_sort_visits').className = 'active';
                b.loadBookmarks();
                localStorage[prefix+'sort'] = 'visits';
            }
        }
        bmSortOpts.appendChild(bmSortAlpha);
        bmSortOpts.appendChild(bmSortDate);
        bmSortOpts.appendChild(bmSortVisits);
        bmSortOpts.appendChild(bmSortDirection);
        return bmSortOpts;
    },
    createPanel: function(/*opt*/embedded) {
        // Creates the bookmarks panel.  If *ad* is true, shows an ad as the first bookmark
        // If the bookmarks panel already exists, re-create the bookmarks container and reset pagination
        // If *embedded* is true then we'll just load the header (without search).
        logDebug('createPanel()');
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            delay = 1000, // Pretty much everything has the 'sectrans' class for 1-second transition effects
            existingPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            bmPanel = u.createElement('div', {'id': prefix+'panel_bookmarks', 'class': 'panel sectrans'}),
            bmHeader = u.createElement('div', {'id': prefix+'bm_header', 'class': 'sectrans'}),
            bmContainer = u.createElement('div', {'id': prefix+'bm_container', 'class': 'sectrans'}),
            bmPagination = u.createElement('div', {'id': prefix+'bm_pagination', 'class': 'sectrans'}),
            bmTagCloud = u.createElement('div', {'id': prefix+'bm_tagcloud', 'class': 'sectrans'}),
            bmTags = u.createElement('div', {'id': prefix+'bm_tags', 'class': 'sectrans'}),
            bmNew = u.createElement('div', {'id': prefix+'bm_new', 'class': 'sectransform'}),
            bmHRFix = u.createElement('hr', {'style': {'opacity': 0, 'margin-bottom': 0}}),
            bmDisplayOpts = u.createElement('div', {'id': prefix+'bm_display_opts', 'class': 'sectransform'}),
            bmSortOpts = b.createSortOpts(),
            bmOptions = u.createElement('div', {'id': prefix+'bm_options'}),
            bmExport = u.createElement('a', {'id': prefix+'bm_export', 'title': 'Save your bookmarks to a file'}),
            bmImport = u.createElement('a', {'id': prefix+'bm_import', 'title': 'Import bookmarks from another application'}),
            bmSync = u.createElement('a', {'id': prefix+'bm_sync', 'title': 'Synchronize your bookmarks with the server.'}),
            bmH2 = u.createElement('h2'),
            bmHeaderImage = u.createElement('span', {'id': prefix+'bm_header_star'}),
            bmTagCloudUL = u.createElement('ul', {'id': prefix+'bm_tagcloud_ul'}),
            bmTagCloudTip = u.createElement('span', {'id': prefix+'bm_tagcloud_tip', 'class': 'sectrans'}),
            bmTagsHeader = u.createElement('h3', {'class': 'sectrans'}),
            bmSearch = u.createElement('input', {'id': prefix+'bm_search', 'name': prefix+'search', 'type': 'search', 'tabindex': 1, 'placeholder': 'Search Bookmarks'}),
            allTags = b.getTags(b.bookmarks),
            toggleSort = u.partial(b.toggleSortOrder, b.bookmarks);
        bmH2.innerHTML = 'Bookmarks';
        if (!embedded) {
            bmH2.appendChild(bmSearch);
            bmSearch.onchange = function(e) {
                b.page = 0;
                if (bmSearch.value) {
                    b.searchFilter = bmSearch.value;
                    b.filterBookmarksBySearchString(bmSearch.value);
                } else {
                    b.searchFilter = null;
                    b.loadBookmarks();
                    // TODO: Make this remove the search string from the URL
                }
            }
        }
        bmHeader.appendChild(bmH2);
        bmTags.innerHTML = '<span id="'+prefix+'bm_taglist_label">Tag Filter:</span> <ul id="'+prefix+'bm_taglist"></ul> ';
        bmSync.innerHTML = 'Sync Bookmarks | ';
        bmImport.innerHTML = 'Import | ';
        bmExport.innerHTML = 'Export';
        bmImport.onclick = function(e) {
            b.importForm();
        }
        bmExport.onclick = function(e) {
            b.openExportDialog();
        }
        bmSync.onclick = function(e) {
            var USN = localStorage[prefix+'USN'] || 0;
            this.innerHTML = "Synchronizing... | ";
            if (!b.bookmarks.length) {
                go.Visual.displayMessage("NOTE: Since this is your first sync it can take a few seconds.  Please be patient.");
            } else {
                go.Visual.displayMessage("Please wait while we synchronize your bookmarks...");
            }
            b.syncTimer = setInterval(function() {
                go.Visual.displayMessage("Please wait while we synchronize your bookmarks...");
            }, 6000);
            u.xhrGet(go.prefs.url+'bookmarks/sync?updateSequenceNum='+USN, b.syncBookmarks);
        }
        bmOptions.appendChild(bmSync);
        bmOptions.appendChild(bmImport);
        bmOptions.appendChild(bmExport);
        bmTags.appendChild(bmOptions);
        bmNew.innerHTML = '+ New';
        bmNew.onclick = b.bookmarkForm;
        bmDisplayOpts.appendChild(bmSortOpts);
        bmHeader.appendChild(bmTags);
        bmHeader.appendChild(bmHRFix); // The HR here fixes an odd rendering bug with Chrome on Mac OS X
        bmTagsHeader.innerHTML = '<a id="bm_user_tags" href="javascript:void(0)">Tags</a>';
        go.Visual.applyTransform(bmTagsHeader, 'translate(300%, 0)');
        go.Visual.applyTransform(bmPagination, 'translate(300%, 0)');
        bmTagCloud.appendChild(bmTagsHeader);
        bmTagCloud.appendChild(bmTagCloudUL);
        bmTagCloudTip.style.opacity = 0;
        bmTagCloudTip.innerHTML = "<br><b>Tip:</b> " + b.generateTip();
        bmTagCloud.appendChild(bmTagCloudTip);
        if (existingPanel) {
            // Remove everything first
            while (existingPanel.childNodes.length >= 1 ) {
                existingPanel.removeChild(existingPanel.firstChild);
            }
            // Fade it in nicely
            bmHeader.style.opacity = 0;
            existingPanel.appendChild(bmHeader);
            existingPanel.appendChild(bmNew);
            existingPanel.appendChild(bmDisplayOpts);
            existingPanel.appendChild(bmContainer);
            existingPanel.appendChild(bmPagination);
            go.Visual.applyTransform(bmNew, 'translate(-300%, 0)');
            go.Visual.applyTransform(bmDisplayOpts, 'translate(300%, 0)');
            setTimeout(function() { // Fade them in
                bmHeader.style.opacity = 1;
                go.Visual.applyTransform(bmNew, '');
                go.Visual.applyTransform(bmDisplayOpts, '');
            }, 700);
            u.getNode('#'+prefix+'bm_sort_direction').onclick = toggleSort;
        } else {
            bmPanel.appendChild(bmHeader);
            u.getNode(go.prefs.goDiv).appendChild(bmPanel);
            if (!embedded) {
                bmPanel.appendChild(bmNew);
                bmPanel.appendChild(bmDisplayOpts);
                bmPanel.appendChild(bmContainer);
                bmPanel.appendChild(bmPagination);
                u.getNode('#'+prefix+'bm_sort_direction').onclick = toggleSort;
            }
        }
        if (!embedded) {
            setTimeout(function() { // Fade them in and load the bookmarks
                go.Visual.applyTransform(bmTagsHeader, '');
                go.Visual.applyTransform(bmPagination, '');
                b.loadBookmarks(1);
            }, 800); // Needs to be just a bit longer than the previous setTimeout
            setTimeout(function() { // This one looks nicer if it comes last
                bmTagCloudTip.style.opacity = 1;
            }, 3000);
            setTimeout(function() { // Make it go away after a while
                bmTagCloudTip.style.opacity = 0;
                setTimeout(function() {
                    u.removeElement(bmTagCloudTip);
                }, 1000);
            }, 30000);
            allTags.forEach(function(tag) {
                var li = u.createElement('li', {'class': 'bm_tag sectrans', 'title': 'Click to filter or drop on a bookmark to tag it.', 'draggable': true});
                li.innerHTML = tag;
                li.addEventListener('dragstart', b.handleDragStart, false);
                go.Visual.applyTransform(li, 'translateX(700px)');
                li.onclick = function(e) {
                    b.addFilterTag(b.bookmarks, tag);
                };
                li.oncontextmenu = function(e) {
                    // Bring up the context menu
                    e.preventDefault(); // Prevent regular context menu
                    b.tagContextMenu(li);
                }
                bmTagCloudUL.appendChild(li);
                if (tag == "Untagged") {
                    li.className = 'bm_tag sectrans untagged';
                }
                setTimeout(function unTrans() {
                    go.Visual.applyTransform(li, '');
                }, delay);
                delay += 50;
            });
            if (existingPanel) {
                existingPanel.appendChild(bmTagCloud);
            } else {
                bmPanel.appendChild(bmTagCloud);
            }
        }
    },
    openBookmark: function(URL) {
        // If the current terminal is in a disconnected state, connects to *URL* in the current terminal.
        // If the current terminal is already connected, opens a new terminal and uses that.
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            bookmark = b.getBookmarkObj(URL),
            term = localStorage[prefix+'selectedTerminal'],
            termTitle = u.getNode('#'+prefix+'term'+term).title;
        if (URL.indexOf('%s') != -1) { // This is a keyword search bookmark
            b.openSearchDialog(URL, bookmark.name);
            return;
        }
        if (URL.slice(0,4) == "http") { // NOTE: Includes https URLs
            // This is a regular URL, open in a new window
            b.incrementVisits(URL);
            go.Visual.togglePanel('#'+prefix+'panel_bookmarks');
            window.open(URL);
            return; // All done
        }
        // Proceed as if this is an SSH URL...
        if (termTitle == 'Gate One') {
            // Foreground terminal has yet to be connected, use it
            b.incrementVisits(URL);
            go.Input.queue(URL+'\n');
            go.Net.sendChars();
        } else {
            b.incrementVisits(URL);
            go.Terminal.newTerminal();
            setTimeout(function() {
                go.Input.queue(URL+'\n');
                go.Net.sendChars();
            }, 250);
        }
        go.Visual.togglePanel('#'+prefix+'panel_bookmarks');
    },
    toggleSortOrder: function(/*opt*/bookmarks) {
        // Reverses the order of the bookmarks list
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            bmSearch = u.getNode('#'+prefix+'bm_search'),
            sortDirection = u.getNode('#'+prefix+'bm_sort_direction');
        if (b.sortToggle) {
            b.sortToggle = false;
            b.loadBookmarks();
            go.Visual.applyTransform(sortDirection, 'rotate(0deg)');
        } else {
            b.sortToggle = true;
            b.loadBookmarks();
            go.Visual.applyTransform(sortDirection, 'rotate(180deg)');
        }
    },
    filterBookmarksBySearchString: function(str) {
        // Filters bookmarks to those matching *str*
        // Set the global search filter so we can use it within other functions
        var go = GateOne,
            b = go.Bookmarks;
        b.searchFilter = str;
        b.loadBookmarks();
    },
    addFilterTag: function(bookmarks, tag) {
        // Adds the given tag to the filter list
        var go = GateOne,
            b = go.Bookmarks;
        for (var i in b.tags) {
            if (b.tags[i] == tag) {
                // Tag already exists, ignore.
                return;
            }
        }
        b.tags.push(tag);
//         if (window.history.pushState) {
//             var tagString = b.tags.join(',');
//             window.history.pushState("", "Bookmarked. Tag Filter: " + tagString, "/?filtertags=" + tagString);
//         }
        // Reset the pagination since our bookmark list will change
        b.page = 0;
        b.loadBookmarks();
    },
    removeFilterTag: function(bookmarks, tag) {
        // Removes the given tag from the filter list
        logDebug('removeFilterTag tag: ' + tag);
        var go = GateOne,
            b = go.Bookmarks;
        for (var i in b.tags) {
            if (b.tags[i] == tag) {
                b.tags.splice(i, 1);
            }
        }
//         if (window.history.pushState) {
//             if (b.tags.length) {
//                 var tagString = b.tags.join(',');
//                 window.history.pushState("", "Bookmarked. Tag Filter: " + tagString, "/?filtertags=" + tagString);
//             } else {
//                 window.history.pushState("", "Default", "/"); // Set it back to the default URL
//             }
//         }
        // Reset the pagination since our bookmark list will change
        b.page = 0;
        b.loadBookmarks();
    },
    addFilterDateTag: function(bookmarks, tag) {
        // Adds the given dateTag to the filter list
        logDebug('addFilterDateTag: ' + tag);
        var go = GateOne,
            b = go.Bookmarks;
        for (var i in b.dateTags) {
            if (b.dateTags[i] == tag) {
                // Tag already exists, ignore.
                return;
            }
        }
        b.dateTags.push(tag);
        // Reset the pagination since our bookmark list will change
        b.page = 0;
        b.loadBookmarks();
    },
    removeFilterDateTag: function(bookmarks, tag) {
        // Removes the given dateTag from the filter list
        logDebug("removeFilterDateTag: " + tag);
        var go = GateOne,
            b = go.Bookmarks;
        // Change the &lt; and &gt; back into < and >
        tag = tag.replace('&lt;', '<');
        tag = tag.replace('&gt;', '>');
        for (var i in b.dateTags) {
            if (b.dateTags[i] == tag) {
                b.dateTags.splice(i, 1);
            }
        }
        b.loadBookmarks();
    },
    getTags: function(/*opt*/bookmarks) {
        // Returns an array of all the tags in Bookmarks.bookmarks or *bookmarks* if given.
        // NOTE: Ordered alphabetically
        var go = GateOne,
            b = go.Bookmarks,
            tagList = [];
        if (!bookmarks) {
            bookmarks = b.bookmarks;
        }
        bookmarks.forEach(function(bookmark) {
            if (bookmark.tags) {
                if (go.Utils.isArray(bookmark.tags)) {
                    bookmark.tags.forEach(function(tag) {
                        if (tagList.indexOf(tag) == -1) {
                            tagList.push(tag);
                        }
                    });
                }
            }
        });
        tagList.sort();
        return tagList;
    },
    importForm: function() {
        // Displays the form where a user can create or edit a bookmark.
        // If *URL* is given, pre-fill the form with the associated bookmark for editing.
        var go = GateOne,
            prefix = go.prefs.prefix,
            u = go.Utils,
            b = go.Bookmarks,
            goDiv = u.getNode(go.prefs.goDiv),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            bmPanelChildren = bmPanel.childNodes,
            bmForm = u.createElement('form', {'name': prefix+'bm_import_form', 'id': prefix+'bm_import_form', 'class': 'sectrans', 'enctype': 'multipart/form-data'}),
            bmSubmit = u.createElement('button', {'id': prefix+'bm_submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            bmCancel = u.createElement('button', {'id': prefix+'bm_cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'}),
            bmHelp = u.createElement('p');
        bmSubmit.innerHTML = "Submit";
        bmCancel.innerHTML = "Cancel";
        bmForm.innerHTML = '<h2>Import Bookmarks</h2><label for="'+prefix+'bookmarks_upload">Please select a bookmarks.html or bookmarks.json file to import.</label><input id="'+prefix+'bookmarks_upload" name="'+prefix+'bookmarks_upload" type="file" /><br /><br />';
        bmCancel.onclick = function(e) {
            // Reset the inline labels in addition to the form
            u.toArray(goDiv.getElementsByClassName('input-text')).forEach(function(node) {
                node.style.backgroundColor = 'transparent';
            });
            // Now slide away the form and bring our regular bookmark panel back.
            go.Visual.applyTransform(bmForm, 'translate(200%, 0)');
            setTimeout(function() {
                u.removeElement(bmForm);
                b.createPanel();
            }, 500);
        };
        bmForm.appendChild(bmSubmit);
        bmForm.appendChild(bmCancel);
        bmHelp.innerHTML = '<br /><i>Imported bookmarks will be synchronized with Evernote the next time you click, "Evernote Sync".</i>'
        bmForm.appendChild(bmHelp);
        go.Visual.applyTransform(bmForm, 'translate(200%, 0)');
        bmPanel.appendChild(bmForm);
        // Slide the existing panel away
        u.toArray(bmPanelChildren).forEach(function(child) {
            if (child.name) {
                if (child.name != prefix+'bm_import_form') {
                    go.Visual.applyTransform(child, 'translate(200%, 0)');
                    setTimeout(function() {
                        child.style.display = "none";
                    }, 750);
                }
            } else {
                if (child.id == prefix+'bm_new') {
                    go.Visual.applyTransform(child, 'translate(-200%, 0)');
                } else {
                    go.Visual.applyTransform(child, 'translate(200%, 0)');
                }
                setTimeout(function() {
                    u.removeElement(child);
                }, 750);
            }
        });
        setTimeout(function() {
            go.Visual.applyTransform(bmForm, '');
        }, 500);
        bmForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            // NOTE:  Using HTML5 file uploads here...  Should work fine in Opera, Firefox, and Webkit
            var delay = 1000,
                fileInput = u.getNode('#'+prefix+'bookmarks_upload'),
                file = fileInput.files[0],
                xhr = new XMLHttpRequest(),
                handleStateChange = function(e) {
                    var status = null;
                    try {
                        status = parseInt(e.target.status);
                    } catch(e) {
                        return;
                    }
                    if (e.target.readyState == 4 && status == 200 && e.target.responseText) {
                        var bookmarks = JSON.parse(e.target.responseText),
                            count = b.storeBookmarks(bookmarks, true);
                        go.Visual.displayMessage(count+" bookmarks imported.");
                        go.Visual.displayMessage("Bookmark icons will be retrieved in the background");
                    }
                };
            if (xhr.addEventListener) {
                xhr.addEventListener('readystatechange', handleStateChange, false);
            } else {
                xhr.onreadystatechange = handleStateChange;
            }
            xhr.open('POST', go.prefs.url+'bookmarks/import', true);
            xhr.setRequestHeader("Content-Type", "application/octet-stream");
            xhr.setRequestHeader("X-File-Name", file.name);
            xhr.send(file);
            bmForm.style.opacity = 0;
        }
    },
    exportBookmarks: function(/*opt*/bookmarks) {
        // Allows the user to save their bookmarks as a Netscape-style HTML file.
        // If *bookmarks* is given, that list will be what is exported.  Otherwise the complete bookmark list will be exported.
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            form = u.createElement('form', {
                'method': 'post',
                'action': go.prefs.url+'bookmarks/export'
            }),
            bookmarksJSON = u.createElement('textarea', {'name': 'bookmarks'});
        if (!bookmarks) {
            bookmarks = b.bookmarks;
        }
        bookmarksJSON.value = JSON.stringify(bookmarks);
        form.appendChild(bookmarksJSON);
        document.body.appendChild(form);
        form.submit();
        setTimeout(function() {
            // No reason to keep this around
            document.body.removeChild(form);
        }, 1000);
    },
    getDateTag: function(dateObj) {
        // Given a Date() object, returns a string such as "<7 days".  Suitable for use as an autotag.
        var dt = new Date();
        // Substract 7 days from today's date
        dt.setDate(parseInt(dt.getDate())-1);
        if (dt < dateObj) {
            return "<1 day";
        }
        dt.setDate(parseInt(dt.getDate())-6);
        if (dt < dateObj) {
            return "<7 days";
        }
        dt.setDate(parseInt(dt.getDate())-23);
        if (dt < dateObj) {
            return "<30 days";
        }
        dt.setDate(parseInt(dt.getDate())-30);
        if (dt < dateObj) {
            return "<60 days";
        }
        dt.setDate(parseInt(dt.getDate())-120);
        if (dt < dateObj) {
            return "<180 days";
        }
        dt.setDate(parseInt(dt.getDate())-245);
        if (dt < dateObj) {
            return "<1 year";
        }
        return ">1 year";
    },
    allTags: function() {
        // Returns an array of all the tags in localStorage['bookmarks']
        // ordered alphabetically
        var tagList = [],
            bookmarks = JSON.parse(localStorage[prefix+'bookmarks']);
        bookmarks.forEach(function(bookmark) {
            bookmark.tags.forEach(function(tag) {
                if (tagList.indexOf(tag) == -1) {
                    tagList.push(tag);
                }
            });
        });
        tagList.sort();
        return tagList;
    },
    bookmarkForm: function(/*Opt*/URL) {
        // Displays the form where a user can create or edit a bookmark.
        // If *URL* is given, pre-fill the form with the associated bookmark for editing.
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            goDiv = u.getNode(go.prefs.goDiv),
            bmTagCloud = u.createElement('ul', {'id': prefix+'bm_tagcloud', 'class': 'sectrans'}),
            bmTagCloudUL = u.createElement('ul', {'id': prefix+'bm_tagcloud_ul'}),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            bmPanelChildren = bmPanel.childNodes,
            bmForm = u.createElement('form', {'name': prefix+'bm_new_form', 'id': prefix+'bm_new_form', 'class': 'sectrans'}),
            bmSubmit = u.createElement('button', {'id': 'bm_submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            bmCancel = u.createElement('button', {'id': 'bm_cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'});
        bmSubmit.innerHTML = "Submit";
        bmCancel.innerHTML = "Cancel";
        if (typeof(URL) == "string") {
            // Editing an existing bookmark
            var bookmarks = JSON.parse(localStorage[prefix+'bookmarks']),
                count = 0,
                index = null;
            bookmarks.forEach(function(bookmark) {
                if (bookmark.url == URL) {
                    index = count;
                }
                count += 1;
            });
            var bmName = bookmarks[index].name,
                bmTags = bookmarks[index].tags,
                bmNotes = bookmarks[index].notes;
            bmForm.innerHTML = '<h2>Edit Bookmark</h2><label for="'+prefix+'bm_newurl">URL</label><input type="text" name="'+prefix+'bm_newurl" id="'+prefix+'bm_newurl" class="input-text-plain" value="' + URL + '"><label for="'+prefix+'bm_new_name">Name</label><input type="text" name="'+prefix+'bm_new_name" id="'+prefix+'bm_new_name" class="input-text-plain" value="' + bmName + '"><label for="'+prefix+'bm_newurl_tags">Tags</label><input type="text" name="'+prefix+'bm_newurl_tags" id="'+prefix+'bm_newurl_tags" class="input-text-plain" value="' + bmTags + '"><label for="'+prefix+'bm_new_notes">Notes</label><textarea id="'+prefix+'bm_new_notes" class="input-text-plain medium">' + bmNotes + '</textarea>';
        } else {
            // Creating a new bookmark (blank form)
            bmForm.innerHTML = '<h2>New Bookmark</h2><label for="'+prefix+'bm_newurl">URL</label><label for="'+prefix+'bm_newurl" class="inlined">ssh://user@host:22 or http://webhost/path</label><input type="text" name="'+prefix+'bm_newurl" id="'+prefix+'bm_newurl" class="input-text"><label for="'+prefix+'bm_new_name">Name</label><label for="'+prefix+'bm_new_name" class="inlined">Web App Server 1</label><input type="text" name="'+prefix+'bm_new_name" id="'+prefix+'bm_new_name" class="input-text"><label for="'+prefix+'bm_newurl_tags">Tags</label><label for="'+prefix+'bm_newurl_tags" class="inlined">Linux, New York, Production</label><input type="text" name="'+prefix+'bm_newurl_tags" id="'+prefix+'bm_newurl_tags" class="input-text"><label for="'+prefix+'bm_new_notes">Notes</label><label for="'+prefix+'bm_new_notes" class="inlined medium">Add some notes about this bookmark.</label><textarea id="'+prefix+'bm_new_notes" class="input-text medium"></textarea>';
        }
        bmCancel.onclick = function(e) {
            // Reset the inline labels in addition to the form
            u.toArray(goDiv.getElementsByClassName('input-text')).forEach(function(node) {
                node.style.backgroundColor = 'transparent';
            });
            // Now slide away the form and bring our regular bookmark panel back.
            go.Visual.applyTransform(bmForm, 'translate(200%, 0)');
            setTimeout(function() {
                u.removeElement(bmForm);
                b.createPanel();
            }, 500);
        };
        bmForm.appendChild(bmSubmit);
        bmForm.appendChild(bmCancel);
        go.Visual.applyTransform(bmForm, 'translate(200%, 0)');
        bmPanel.appendChild(bmForm);
        // Slide the existing panel away
        u.toArray(bmPanelChildren).forEach(function(child) {
            if (child.name) {
                if (child.name != prefix+'bm_new_form') {
                    go.Visual.applyTransform(child, 'translate(200%, 0)');
                    setTimeout(function() {
                        child.style.display = "none";
                    }, 750);
                }
            } else {
                go.Visual.applyTransform(child, 'translate(200%, 0)');
                setTimeout(function() {
                    child.style.display = "none";
                }, 750);
            }
        });
        setTimeout(function() {
            go.Visual.applyTransform(bmForm, 'translate(0, 0)');
            setTimeout(function() {
                u.getNode('#'+prefix+'bm_newurl').focus();
            }, 1000);
        }, 500);
        // Set our onchange event to remove the inline label once the user has started typing
        u.toArray(goDiv.getElementsByClassName('input-text')).forEach(function(node) {
            node.onfocus = function(e) {
                this.style.cssText = "background-color: #fff";
                this.previousSibling.style.opacity = 0;
            };
            node.onblur = function(e) {
                if (!this.value) { // Show label again if field is empty
                    this.style.cssText = "background-color: transparent";
                    this.previousSibling.style.opacity = 1;
                }
            };
        });
        // TODO: Add validation (also make sure user isn't making an identical bookmark)
        bmForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            // Grab the form values
            var delay = 1000,
                url = u.getNode('#'+prefix+'bm_newurl').value,
                name = u.getNode('#'+prefix+'bm_new_name').value,
                tags = u.getNode('#'+prefix+'bm_newurl_tags').value,
                notes = u.getNode('#'+prefix+'bm_new_notes').value,
                now = new Date();
            // Fix any missing trailing slashes in the URL
            if (url.slice(0,4) == "http" && url.indexOf('/', 7) == -1) {
                url = url + "/";
            }
            if (tags) {
                // Convert to list
                tags = tags.split(',');
                tags = tags.map(function(item) {
                    return item.trim();
                });
            } else {
                tags = [];
            }
            if (typeof(URL) != "string") { // We're creating a new bookmark
                // Construct a new bookmark object
                var bm = {
                    'url': url,
                    'name': name,
                    'tags': tags,
                    'notes': notes,
                    'visits': 0,
                    'updated': now.getTime(),
                    'created': now.getTime(),
                    'updateSequenceNum': 0, // This will get set when synchronizing with the server
                    'images': {'favicon': null}
                };
                b.createOrUpdateBookmark(bm);
                // Fetch its icon
                b.updateIcon(bm);
                // Keep everything sync'd up.
                setTimeout(function() {
                    var USN = localStorage[prefix+'USN'] || 0;
                    u.xhrGet(go.prefs.url+'bookmarks/sync?updateSequenceNum='+USN, b.syncBookmarks);
                    b.createPanel();
                }, 1000);
            } else {
                // Find the existing bookmark and replace it.
                for (var i in b.bookmarks) {
                    if (b.bookmarks[i].url == URL) { // Note that we're matching the original URL
                        // This is our bookmark
                        b.bookmarks[i].url = url;
                        b.bookmarks[i].name = name;
                        b.bookmarks[i].notes = notes;
                        b.bookmarks[i].tags = tags;
                        b.bookmarks[i].updated = now.getTime();
                        b.bookmarks[i].updateSequenceNum = 0;
                        if (url != URL) { // We're changing the URL for this bookmark
                            // Have to delete the old one since the URL is used as the index in the indexedDB
                            b.deleteBookmark(URL); // Delete the original URL
                        }
                        // Store the modified bookmark
                        b.createOrUpdateBookmark(b.bookmarks[i]);
                        // Re-fetch its icon (have to wait a sec since storeBookmark is async)
                        setTimeout(function() {
                            b.updateIcon(b.bookmarks[i]);
                            b.createPanel();
                        }, 1000);
                        break;
                    }
                }
            }
            bmForm.style.opacity = 0;
        }
    },
    incrementVisits: function(url) {
        // Increments the given bookmark by 1
        var go = GateOne,
            b = go.Bookmarks;
        // Increments the given bookmark by 1
        b.bookmarks.forEach(function(bookmark) {
            if (bookmark.url == url) {
                bookmark.visits += 1;
                bookmark.updated = new Date().getTime(); // So it will sync
                bookmark.updateSequenceNum = 0;
                b.storeBookmark(bookmark);
            }
        });
        b.loadBookmarks(b.sort);
    },
    editBookmark: function(obj) {
        // Slides the bookmark editor form into view
        // Note: Only meant to be called with a bm_edit anchor as *obj*
        var go = GateOne,
            url = obj.parentNode.parentNode.getElementsByClassName("bm_url")[0].href;
        go.Bookmarks.bookmarkForm(url);
    },
    highestUSN: function() {
        // Returns the highest updateSequenceNum in all the bookmarks
        var b = GateOne.Bookmarks,
            highest = 0;
        b.bookmarks.forEach(function(bookmark) {
            if (bookmark['updateSequenceNum'] > highest) {
                highest = bookmark['updateSequenceNum'];
            }
        });
        return highest;
    },
    deleteBookmark: function(obj) {
        // Deletes the given bookmark..  *obj* can either be a URL (string) or the "go_bm_delete" anchor tag.
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            url = null,
            count = 0,
            remove = null,
            confirmElement = u.createElement('div', {'id': prefix+'bm_confirm_delete', 'class': 'bookmark halfsectrans'}),
            yes = u.createElement('button', {'id': prefix+'bm_yes', 'class': 'button black'}),
            no = u.createElement('button', {'id': prefix+'bm_no', 'class': 'button black'}),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks');
        if (typeof(obj) == "string") {
            url = obj;
        } else {
            // Assume this is an anchor tag from the onclick event
            url = obj.parentNode.parentNode.getElementsByClassName("bm_url")[0].href;
        }
        yes.innerHTML = "Yes";
        no.innerHTML = "No";
        yes.onclick = function(e) {
            var USN = localStorage[prefix+'USN'] || 0;
            go.Visual.applyTransform(obj.parentNode.parentNode, 'translate(-200%, 0)');
            // Find the matching bookmark and delete it
            for (var i in b.bookmarks) {
                if (b.bookmarks[i].url == url) {
                    b.bookmarks.splice(i, 1); // Remove the bookmark in question.
                }
            }
            // Now save our new bookmarks list to disk
            localStorage[prefix+'bookmarks'] = JSON.stringify(b.bookmarks);
            // Keep everything sync'd up.
            u.xhrGet(go.prefs.url+'bookmarks/sync?updateSequenceNum='+USN, b.syncBookmarks);
            setTimeout(function() {
                u.removeElement(obj.parentNode.parentNode);
            }, 1000);
        };
        no.onclick = function(e) {
            // Remove the confirmation element
            var confirm = u.getNode('#'+go.prefs.prefix+'bm_confirm_delete');
            confirm.style.opacity = 0;
            setTimeout(function() {
                u.removeElement(confirm);
            }, 500);
        };
        // Confirm the user wants to delete the bookmark
        confirmElement.innerHTML = "Are you sure you want to delete this bookmark?<br />";
        confirmElement.appendChild(no);
        confirmElement.appendChild(yes);
        obj.parentNode.parentNode.appendChild(confirmElement);
        setTimeout(function() {
            confirmElement.style.opacity = 1;
        }, 250);
        // Save this bookmark in the deleted bookmarks list so we can let the server know the next time we sync
        var deletedBookmarks = localStorage[prefix+'deletedBookmarks'],
            deleted = new Date().getTime();
        if (!deletedBookmarks) {
            localStorage[prefix+'deletedBookmarks'] = JSON.stringify([{'url': url, 'deleted': deleted}]);
        } else {
            var existing = JSON.parse(deletedBookmarks);
            existing.push({'url': url, 'deleted': deleted});
            localStorage[prefix+'deletedBookmarks'] = JSON.stringify(existing);
        }
    },
    updateUSN: function(obj) {
        // Updates the USN of the bookmark matching *obj* in GateOne.Bookmarks.bookmarks (and on disk).
        var go = GateOne,
            b = go.Bookmarks,
            matched = null;
        for (var i in b.bookmarks) {
            if (b.bookmarks[i]) {
                if (b.bookmarks[i].url == obj.url) {
                    // Replace this one
                    b.bookmarks[i].updateSequenceNum = obj.updateSequenceNum;
                    matched = b.bookmarks[i];
                }
            }
        };
        // storeBookmark takes care of duplicates automatically
        if (matched) {
            b.storeBookmark(matched);
        }
    },
    createOrUpdateBookmark: function(obj) {
        // Creates or updates a bookmark (in Bookmarks.bookmarks and storage) using *obj*
        var go = GateOne,
            u = go.Utils,
            b = go.Bookmarks,
            prefix = go.prefs.prefix,
            matched = false;
        for (var i in b.bookmarks) {
            if (b.bookmarks[i]) {
                if (b.bookmarks[i].url == obj.url) {
                    // Double-check the images to make sure we're not throwing one away
                    if (u.items(b.bookmarks[i].images).length) {
                        if (!u.items(obj.images).length) {
                            // No images in obj. Replace them with existing
                            obj['images'] = b.bookmarks[i].images;
                        }
                    }
                    // Replace this one
                    b.bookmarks[i] = obj;
                    matched = true;
                }
            }
        };
        if (!matched) {
            // Fix the name (i.e. remove leading spaces)
            obj.name = obj.name.trim();
            b.bookmarks.push(obj);
        }
        // Check if this is a keyword search
        if (obj.url.indexOf('%s') != -1) {
            // Auto-tag Searches with the "Searches" tag
            if (obj.tags.indexOf('Searches') == -1) {
                obj.tags.push('Searches');
            }
        }
        // storeBookmark takes care of duplicates automatically
        b.storeBookmark(obj);
        // Add this bookmark to the icon fetching queue
        localStorage[prefix+'iconQueue'] += obj.url + '\n';
    },
    getMaxBookmarks: function(elem) {
    // Calculates and returns the number of bookmarks that will fit in the given element ID (elem).
        try {
            var go = GateOne,
                b = go.Bookmarks,
                u = go.Utils,
                node = u.getNode(elem),
                tempBookmark = {
                    'url': "http://tempbookmark",
                    'name': "You should not see this",
                    'tags': [],
                    'notes': "This should never be visible.  If you see this, well, sigh.",
                    'visits': 0,
                    'updated': new Date().getTime(),
                    'created': new Date().getTime(),
                    'updateSequenceNum': 0, // This will get set when synchronizing with the server
                    'images': {}
                },
                bmElement = b.createBookmark(node, tempBookmark, 1000),
                nodeStyle = window.getComputedStyle(node, null),
                bmStyle = window.getComputedStyle(bmElement, null),
                nodeHeight = parseInt(nodeStyle['height'].split('px')[0]),
                height = parseInt(bmStyle['height'].split('px')[0]),
                marginBottom = parseInt(bmStyle['marginBottom'].split('px')[0]),
                paddingBottom = parseInt(bmStyle['paddingBottom'].split('px')[0]),
                borderBottomWidth = parseInt(bmStyle['borderBottomWidth'].split('px')[0]),
                borderTopWidth = parseInt(bmStyle['borderTopWidth'].split('px')[0]),
                bookmarkHeight = height+marginBottom+paddingBottom+borderBottomWidth+borderTopWidth,
                max = Math.floor(nodeHeight/ bookmarkHeight);
        } catch(e) {
            return 1; // Errors can happen when loadBookmarks is called too quickly sometimes.  Almost always auto-corrects itself so no big deal.
        }
        u.removeElement(bmElement); // Don't want this hanging around
        return max;
    },
    loadPagination: function(bookmarks, /*opt*/page) {
        // Sets up the pagination for the given array of bookmarks and returns the pagination node.
        // If *page* is given, the pagination will highlight the given page number and adjust prev/next accordingly
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            bmPaginationUL = u.createElement('ul', {'id': prefix+'bm_pagination_ul', 'class': 'bm_pagination halfsectrans'}),
            bmContainer = u.getNode('#'+prefix+'bm_container'),
            bmMax = b.getMaxBookmarks('#'+prefix+'bm_container'),
            bmPages = Math.ceil(bookmarks.length/bmMax),
            prev = u.createElement('li', {'class': 'bm_page halfsectrans'}),
            next = u.createElement('li', {'class': 'bm_page halfsectrans'});
        // Add the paginator
        if (typeof(page) == 'undefined' || page == null) {
            page = 0;
        }
        if (page == 0) {
            prev.className = 'bm_page halfsectrans inactive';
        } else {
            prev.onclick = function(e) {
                e.preventDefault();
                b.page -= 1;
                b.loadBookmarks();
            }
        }
        prev.innerHTML = '<a id="'+prefix+'bm_prevpage" href="javascript:void(0)">« Previous</a>';
        bmPaginationUL.appendChild(prev);
        if (bmPages > 0) {
            for (var i=0; i<=(bmPages-1); i++) {
                var li = u.createElement('li', {'class': 'bm_page halfsectrans'});
                if (i == page) {
                    li.innerHTML = '<a class="active" href="javascript:void(0)">'+(i+1)+'</a>';
                } else {
                    li.innerHTML = '<a href="javascript:void(0)">'+(i+1)+'</a>';
                    li.title = i+1;
                    li.onclick = function(e) {
                        e.preventDefault();
                        b.page = parseInt(this.title)-1;
                        b.loadBookmarks();
                    }
                }
                bmPaginationUL.appendChild(li);
            }
        } else {
            var li = u.createElement('li', {'class': 'bm_page halfsectrans'});
            li.innerHTML = '<a href="javascript:void(0)" class="active">1</a>';
            bmPaginationUL.appendChild(li);
        }
        if (page == bmPages-1 || bmPages == 0) {
            next.className = 'bm_page halfsectrans inactive';
        } else {
            next.onclick = function(e) {
                e.preventDefault();
                b.page += 1;
                b.loadBookmarks();
            }
        }
        next.innerHTML = '<a id="'+prefix+'bm_nextpage" href="javascript:void(0)">Next »</a>';
        bmPaginationUL.appendChild(next);
        return bmPaginationUL;
    },
    getBookmarkObj: function(URL) {
        // Returns the bookmark object with the given *URL*
        var go = GateOne,
            b = go.Bookmarks;
        for (var i in b.bookmarks) {
            if (b.bookmarks[i].url == URL) {
                return b.bookmarks[i];
            }
        }
    },
    addTagToBookmark: function(URL, tag) {
        // Adds the given *tag* to the bookmark object associated with *URL*
        logInfo('addTagToBookmark tag: ' + tag);
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            goDiv = u.getNode(go.prefs.goDiv),
            visibleBookmarks = u.toArray(goDiv.getElementsByClassName('bookmark'));
        for (var i in b.bookmarks) {
            if (b.bookmarks[i].url == URL) {
                b.bookmarks[i].tags.push(tag);
                // Now remove the "Untagged" tag if present
                for (var n in b.bookmarks[i].tags) {
                    if (b.bookmarks[i].tags[n] == 'Untagged') {
                        b.bookmarks[i].tags.splice(n, 1);
                    }
                }
                // Now make the change permanent
                b.storeBookmark(b.bookmarks[i]);
            }
        }
        visibleBookmarks.forEach(function(bookmark) {
            var bmURL = bookmark.getElementsByClassName('bm_url')[0].href,
                bmTaglist = bookmark.getElementsByClassName('bm_taglist')[0];
            if (URL == bmURL) {
                // This is our bookmark, append this tag to bm_tags
                var bmTag = u.createElement('li', {'class': 'bm_tag'});
                bmTag.innerHTML = tag;
                bmTag.onclick = function(e) {
                    b.addFilterTag(b.filteredBookmarks, tag);
                };
                bmTaglist.appendChild(bmTag);
            }
            // Now remove the "Untagged" tag
            for (var i in bmTaglist.childNodes) {
                if (bmTaglist.childNodes[i].innerHTML == "Untagged") {
                    u.removeElement(bmTaglist.childNodes[i]);
                }
            }
        });
    },
    storeBookmark: function(bookmarkObj, /*opt*/callback) {
        // Stores the given *bookmarkObj* in the DB
        // if *callback* is given, will be executed after the bookmark is stored with the bookmarkObj as the only argument
        // Assume Bookmarks.bookmarks has already been updated and stringify them to localStorage['bookmarks']
        localStorage[GateOne.prefs.prefix+'bookmarks'] = JSON.stringify(GateOne.Bookmarks.bookmarks);
        if (callback) {
            callback(bookmarkObj);
        }
    },
    renameTag: function(oldName, newName) {
        // Renames the tag with *oldName* to be *newName* for all notes that have it attached.
        var go = GateOne,
            prefix = go.prefs.prefix,
            u = go.Utils,
            b = go.Bookmarks,
            success = false;
        b.bookmarks.forEach(function(bookmark) {
            for (var i in bookmark.tags) {
                if (bookmark.tags[i] == oldName) {
                    bookmark.tags[i] = newName;
                    b.createOrUpdateBookmark(bookmark);
                    success = true;
                }
            }
        });
        if (success) {
            go.Visual.displayMessage(oldName + " has been renamed to " + newName);
            // Mark down that we've renamed this tag so we can update Evernote at the next sync
            if (localStorage[prefix+'renamedTags']) {
                var renamedTags = JSON.parse(localStorage[prefix+'renamedTags']);
                renamedTags.push(oldName + ',' + newName);
                localStorage[prefix+'renamedTags'] = JSON.stringify(renamedTags);
            } else {
                localStorage[prefix+'renamedTags'] = JSON.stringify([oldName + ',' + newName]);
            }
            b.createPanel();
        }
    },
    tagContextMenu: function(elem) {
        // Called when we right-click on a tag
        // Close any existing context menu before we do anything else
        var go = GateOne,
            prefix = go.prefs.prefix,
            u = go.Utils,
            b = go.Bookmarks,
            existing = u.getNode('#'+prefix+'bm_context'),
            offset = b.getOffset(elem),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            bmPanelWidth = bmPanel.offsetWidth,
            rename = u.createElement('a', {'id': prefix+'bm_context_rename', 'class': 'pointer'}),
            cancel = u.createElement('a', {'id': prefix+'bm_context_cancel', 'class': 'pointer'}),
            menu = u.createElement('div', {'id': prefix+'bm_context', 'class': 'quartersectrans'});
        if (existing) {
            existing.style.opacity = 0;
            setTimeout(function() {
                u.removeElement(existing);
            }, 1000);
        }
        rename.innerHTML = "Rename: " + elem.innerHTML;
        cancel.innerHTML = "Cancel";
        menu.appendChild(rename);
        menu.appendChild(cancel);
        menu.style.opacity = 0;
        rename.onclick = function(e) {
            menu.style.opacity = 0;
            setTimeout(function() {
                u.removeElement(menu);
            }, 1000);
            b.openRenameDialog(elem.innerHTML);
        }
        cancel.onclick = function(e) {
            menu.style.opacity = 0;
            setTimeout(function() {
                u.removeElement(menu);
            }, 1000);
        }
        bmPanel.appendChild(menu);
        if (bmPanelWidth-offset.left < menu.offsetWidth) {
            menu.style['right'] = '0px';
        } else {
            menu.style['left'] = offset.left+'px';
        }
        menu.style['top'] = offset.top+'px';
        setTimeout(function() {
            menu.style.opacity = 1;
        }, 250);
    },
    openRenameDialog: function(tagName) {
        // Creates a dialog where the user can rename the given *tagName*
        var go = GateOne,
            prefix = go.prefs.prefix,
            u = go.Utils,
            b = go.Bookmarks,
            dialogContainer = u.createElement('div', {'id': prefix+'dialogcontainer', 'class': 'halfsectrans'}),
            dialogDiv = u.createElement('div', {'id': prefix+'dialogdiv'}),
            dialogTitle = u.createElement('h3', {'id': prefix+'dialogtitle'}),
            close = u.createElement('div', {'id': prefix+'dialog_close'}),
            bmForm = u.createElement('form', {'name': prefix+'bm_dialog_form', 'id': prefix+'bm_dialog_form', 'class': 'sectrans'}),
            bmSubmit = u.createElement('button', {'id': prefix+'bm_submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            bmCancel = u.createElement('button', {'id': prefix+'bm_cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'}),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            closeDialog = function(e) {
                if (e) { e.preventDefault() }
                dialogContainer.style.opacity = 0;
//                 setTimeout(function() {
//                     u.removeElement(dialogContainer);
//                 }, 1000);
            };
        bmForm.innerHTML = '<label for="'+prefix+'bm_newtagname">New Name</label><input type="text" name="'+prefix+'bm_newtagname" id="'+prefix+'bm_newtagname" autofocus required>';
        bmCancel.onclick = closeDialog;
        bmForm.appendChild(bmSubmit);
        bmForm.appendChild(bmCancel);
        bmSubmit.innerHTML = "Submit";
        bmCancel.innerHTML = "Cancel";
        dialogContainer.style.opacity = 0;
        setTimeout(function() {
            dialogContainer.style.opacity = 1;
            u.getNode('#'+prefix+'bm_newtagname').focus();
        }, 100);
        close.innerHTML = "X";
        close.onclick = closeDialog;
        dialogTitle.innerHTML = "Rename Tag: " + tagName;
        dialogContainer.appendChild(dialogTitle);
        dialogTitle.appendChild(close);
        dialogContainer.style.opacity = 0;
        dialogContainer.appendChild(dialogDiv);
        bmPanel.appendChild(dialogContainer);
        dialogDiv.appendChild(bmForm);
        bmForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            var newName = u.getNode('#'+prefix+'bm_newtagname').value;
            b.renameTag(tagName, newName);
            closeDialog();
        }
    },
    openExportDialog: function() {
        // Creates a dialog where the user can select some options and export their bookmarks
        var go = GateOne,
            prefix = go.prefs.prefix,
            u = go.Utils,
            b = go.Bookmarks,
            dialogContainer = u.createElement('div', {'id': prefix+'dialogcontainer', 'class': 'halfsectrans'}),
            dialogDiv = u.createElement('div', {'id': prefix+'dialogdiv'}),
            dialogTitle = u.createElement('h3', {'id': prefix+'dialogtitle'}),
            close = u.createElement('div', {'id': prefix+'dialog_close'}),
            bmForm = u.createElement('form', {'name': prefix+'bm_export_form', 'id': prefix+'bm_export_form', 'class': 'sectrans'}),
            buttonContainer = u.createElement('div', {'id': prefix+'bm_buttons'}),
            bmExportAll = u.createElement('button', {'id': prefix+'bm_export_all', 'type': 'submit', 'value': 'all', 'class': 'button black'}),
            bmExportFiltered = u.createElement('button', {'id': prefix+'bm_export_filtered', 'type': 'submit', 'value': 'all', 'class': 'button black'}),
            bmCancel = u.createElement('button', {'id': prefix+'bm_cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'}),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            closeDialog = function(e) {
                if (e) { e.preventDefault() }
                dialogContainer.style.opacity = 0;
                setTimeout(function() {
                    u.removeElement(dialogContainer);
                }, 1000);
            };
        bmForm.innerHTML = '<p>You can export all bookmarks or just bookmarks within the current filter/search</p>';
        bmCancel.onclick = closeDialog;
        buttonContainer.appendChild(bmExportAll);
        buttonContainer.appendChild(bmExportFiltered);
        buttonContainer.appendChild(bmCancel);
        bmExportAll.innerHTML = "All Bookmarks";
        bmExportFiltered.innerHTML = "Filtered Bookmarks";
        bmCancel.innerHTML = "Cancel";
        bmForm.appendChild(buttonContainer);
        dialogContainer.style.opacity = 0;
        setTimeout(function() {
            dialogContainer.style.opacity = 1;
        }, 100);
        close.innerHTML = "X";
        close.onclick = closeDialog;
        dialogTitle.innerHTML = "Export Bookmarks";
        dialogContainer.appendChild(dialogTitle);
        dialogTitle.appendChild(close);
        dialogContainer.style.opacity = 0;
        dialogContainer.appendChild(dialogDiv);
        bmPanel.appendChild(dialogContainer);
        dialogDiv.appendChild(bmForm);
        bmExportAll.onclick = function(e) {
            e.preventDefault();
            b.exportBookmarks();
            closeDialog();
        }
        bmExportFiltered.onclick = function(e) {
            e.preventDefault();
            b.exportBookmarks(b.filteredBookmarks);
            closeDialog();
        }
    },
    openSearchDialog: function(URL, title) {
        // Creates a dialog where the user can utilize a keyword search *URL*
        // *title* will be used to create the dialog title like this:  "Keyword Search: *title*"
        var go = GateOne,
            b = go.Bookmarks,
            u = go.Utils,
            prefix = go.prefs.prefix,
            dialogContainer = u.createElement('div', {'id': prefix+'dialogcontainer', 'class': 'halfsectrans'}),
            dialogDiv = u.createElement('div', {'id': prefix+'dialogdiv'}),
            dialogTitle = u.createElement('h3', {'id': prefix+'dialogtitle'}),
            close = u.createElement('div', {'id': prefix+'dialog_close'}),
            bmForm = u.createElement('form', {'name': prefix+'bm_dialog_form', 'id': prefix+'bm_dialog_form', 'class': 'sectrans'}),
            bmSubmit = u.createElement('button', {'id': prefix+'bm_submit', 'type': 'submit', 'value': 'Submit', 'class': 'button black'}),
            bmCancel = u.createElement('button', {'id': prefix+'bm_cancel', 'type': 'reset', 'value': 'Cancel', 'class': 'button black'}),
            bmPanel = u.getNode('#'+prefix+'panel_bookmarks'),
            closeDialog = function(e) {
                if (e) { e.preventDefault() }
                dialogContainer.style.opacity = 0;
                setTimeout(function() {
                    u.removeElement(dialogContainer);
                }, 1000);
            };
        bmForm.innerHTML = '<label for='+prefix+'"bm_keyword_seach">Search</label><input type="text" name="'+prefix+'bm_searchstring" id="'+prefix+'bm_searchstring" autofocus required>';
        bmCancel.onclick = closeDialog;
        bmForm.appendChild(bmSubmit);
        bmForm.appendChild(bmCancel);
        bmSubmit.innerHTML = "Submit";
        bmCancel.innerHTML = "Cancel";
        dialogContainer.style.opacity = 0;
        setTimeout(function() {
            dialogContainer.style.opacity = 1;
        }, 100);
        close.innerHTML = "X";
        close.onclick = closeDialog;
        dialogTitle.innerHTML = "Keyword Search: " + title;
        dialogContainer.appendChild(dialogTitle);
        dialogTitle.appendChild(close);
        dialogContainer.style.opacity = 0;
        dialogContainer.appendChild(dialogDiv);
        bmPanel.appendChild(dialogContainer);
        dialogDiv.appendChild(bmForm);
        bmForm.onsubmit = function(e) {
            // Don't actually submit it
            e.preventDefault();
            b.incrementVisits(URL);
            var searchString = u.getNode('#'+prefix+'bm_searchstring').value;
            window.location = URL.replace('%s', searchString);
            closeDialog();
        }
    },
    generateTip: function() {
        // Returns a string with a tip
        var tips = [
            "You can right-click on a tag to rename it.",
            "You can drag & drop a tag onto a bookmark to tag it.",
            "You can create bookmarks with any kind of URL. Even email address URLs: 'mailto:user@domain.com'.",
            "The 'Filtered Bookmarks' option in the export dialog is a great way to share a subset of your bookmarks with friends and coworkers.",
        ];
        return tips[Math.floor(Math.random()*tips.length)];
    },
    updateProgress: function(name, total, num, /*opt*/desc) {
        // Creates/updates a progress bar given a *name*, a *total*, and *num* representing the current state.
        // Optionally, a description (*desc*) may be provided that will be placed above the progress bar
        var go = GateOne,
            u = go.Utils,
            prefix = go.prefs.prefix,
            existing = u.getNode('#' + name),
            existingBar = u.getNode('#' + name + 'bar'),
            progress = Math.round((num/total)*100),
            progressContainer = u.createElement('div', {'class': 'bm_progresscontainer', 'id': name}),
            progressBarContainer = u.createElement('div', {'class': 'bm_progressbarcontainer'}),
            progressBar = u.createElement('div', {'class': 'bm_progressbar', 'id': name+'bar'});
        if (existing) {
            existingBar.style.width = progress + '%';
        } else {
            if (desc) {
                progressContainer.innerHTML = desc + "<br />";
            }
            progressBar.style.width = progress + '%';
            progressBarContainer.appendChild(progressBar);
            progressContainer.appendChild(progressBarContainer);
            u.getNode('#'+prefix+'noticecontainer').appendChild(progressContainer);
        }
        if (progress == 100) {
            existing = u.getNode('#' + name); // Have to reset this just in case
            setTimeout(function() {
                existing.style.opacity = 0;
                setTimeout(function() {
                    u.removeElement(existing);
                }, 5000);
            }, 1000);
        }
    },
    getOffset: function(el) {
        var _x = 0;
        var _y = 0;
        while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
            _x += el.offsetLeft - el.scrollLeft;
            _y += el.offsetTop - el.scrollTop;
            el = el.offsetParent;
        }
        return { top: _y, left: _x };
    },
    handleDragStart: function(e) {
        // Target (this) element is the source node.
        GateOne.Bookmarks.temp = this; // Temporary holding space
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    },
    handleDragOver: function(e) {
        if (e.preventDefault) {
            e.preventDefault(); // Necessary. Allows us to drop.
        }
        e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.
        this.className = 'bookmark over';
        return false;
    },
    handleDragEnter: function(e) {
        // this / e.target is the current hover target.
        this.className = 'bookmark over';
    },
    handleDragLeave: function(e) {
        this.className = 'bookmark sectrans';
    },
    handleDrop: function(e) {
        // this / e.target is current target element.
        if (e.stopPropagation) {
            e.stopPropagation(); // stops the browser from redirecting.
        }
        // Don't do anything if dropping the same column we're dragging.
        if (GateOne.Bookmarks.temp != this) {
            // Add the tag to the bookmark it was dropped on.
            var url = this.getElementsByClassName('bm_url')[0].href;
            GateOne.Bookmarks.addTagToBookmark(url, e.dataTransfer.getData('text/html'));
        }
        this.className = 'bookmark halfsectrans';
        GateOne.Bookmarks.temp = "";
        return false;
    },
    handleDragEnd: function(e) {
        // this/e.target is the source node.
//         [].forEach.call(bmElement, function (bmElement) {
//             bmElement.className = 'bookmark sectrans';
//         });
    }
});

})(window);
const { ref, createApp, onMounted } = Vue;

const masterServers = [
    "http://ed.thebeerkeg.net/server/list",
    "http://eldewrito.red-m.net/list"
];

const playlists = [
    'all',
    'social',
    'ranked',
    'customs',
    'favourites'
];

createApp({
    setup() {
        const servers = ref([]);
        const serverUrls = ref([]);
        const loading = ref(false);
        const focussedServer = ref(null);

        onMounted(async () => {
           await getServersFromMasterServers();
        });

        function setFocussedServer(server) {
            focussedServer.value = server;
        }

        function playerCount() {
            let players = 0;

            servers.value.forEach((server) => {
                players += server.players.length;
            });

            return players;
        }

        function handleMasterServerResponse(response) {
            if (response.code) {
                console.error(response.msg || response.code);
                return;
            }

            // Form unique set of server urls.
            serverUrls.value = [
                ...new Set([
                    ...serverUrls.value,
                    ...response.result.servers
                ])
            ];
        }

        async function getServersFromMasterServers() {
            loading.value = true;

            serverUrls.value = [];

            console.log("refreshing...");

            try {
                const requests = masterServers.map((url) => fetch(url));
                const responses = await Promise.all(requests);
                const errors = responses.filter((response) => !response.ok);

                if (errors.length > 0) {
                    throw errors.map((response) => Error(response.statusText));
                }

                const masterServerJsons = responses.map((response) => response.json());
                const data = await Promise.all(masterServerJsons);

                data.forEach(handleMasterServerResponse);
                await updateServers();
            } catch (errors) {
                console.error(errors);
            }
        }

        async function handleServerResponse(response, url, ping) {
            try {
                if (!response.ok) {
                    throw Error(response.statusText);
                }

                const serverInfo = await response.json();

                let server = {
                    url,
                    ping,
                    type: serverInfo.passworded ? 'private' : ''
                };

                Object.assign(server, serverInfo);

                servers.value.push(server);
            } catch (error) {
                console.error(error);
            }
        }

        async function updateServers() {
            servers.value = [];

            const startDate = new Date();

            let promises = [];

            serverUrls.value.forEach((serverUrl) => {
                promises.push(
                    fetch(`http://${serverUrl}`).then((response) => {
                        const ping = new Date() - startDate;

                        handleServerResponse(response, serverUrl, ping)
                    })
                )
            });

            Promise.all(promises)
                .then(() => {
                    loading.value = false;
                });
        }

        return {
            servers,
            serverUrls,
            refreshVue: getServersFromMasterServers,
            handleMasterServerResponse,
            handleServerResponse,
            updateServers,
            playerCount,
            focussedServer,
            setFocussedServer
        }
    }
}).mount('#app');

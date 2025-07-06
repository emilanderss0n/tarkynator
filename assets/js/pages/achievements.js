import { fetchData } from '../core/cache.js';

document.addEventListener('DOMContentLoaded', () => {

    const achievementsContainer = document.getElementById('achievementsContainer');
    const achievementsContent = document.getElementById('achievementsContent');

    const fetchAchievementsData = () => {
        const query = `
            query {
                achievements {
                    id
                    name
                    imageLink
                    description
                    rarity
                    hidden
                }
            }
        `;

        const url = 'https://api.tarkov.dev/graphql';
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip'
            },
            body: JSON.stringify({ query })
        };

        fetchData(url, options)
            .then(data => {
                if (data && data.data && data.data.achievements) {
                    // Store the achievements data in localStorage
                    localStorage.setItem('achievementsData', JSON.stringify(data.data.achievements));

                    // Fetch the achievements.json file
                    fetch('data/achievements.json')
                        .then(response => response.json())
                        .then(jsonData => {
                            const achievementsHTML = data.data.achievements.map(achievement => {
                                return `
                                    <div class="achievements-item card ${achievement.hidden ? 'ach-hidden' : ''} ${achievement.rarity.toLowerCase()}">
                                        <img src="${achievement.imageLink}" alt="${achievement.name}">
                                        <div class="content">
                                            <h4>${achievement.name}</h4>
                                            <p>${achievement.description}</p>
                                            <span class="global-id">${achievement.id}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('');
                            achievementsContent.innerHTML = achievementsHTML;
                        })
                        .catch(error => {
                            console.error('Error fetching achievements.json:', error);
                            achievementsContent.innerHTML = 'Error fetching achievements data.';
                        });
                } else {
                    achievementsContent.innerHTML = 'No achievements data found.';
                }
            })
            .catch(error => {
                console.error('Error fetching achievements data:', error);
                achievementsContent.innerHTML = 'Error fetching achievements data.';
            });
    };


    fetchAchievementsData();

});
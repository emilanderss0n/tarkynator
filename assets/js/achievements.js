import { fetchData } from './cache.js';

document.addEventListener('DOMContentLoaded', () => {

    const achievementsContainer = document.getElementById('achievementsContainer');
    const achievementsContent = document.getElementById('achievementsContent');

    const fetchAchievementsData = () => {
        const query = `
            query {
                achievements {
                    id
                    name
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

                    const achievementsHTML = data.data.achievements.map(achievement => `
                    <div class="achievements-item card ${achievement.hidden ? 'ach-hidden' : ''} ${achievement.rarity.toLowerCase()}">
                        <h4>${achievement.name}</h4>
                        <p>${achievement.description}</p>
                        <span class="global-id">${achievement.id}</span>
                    </div>
                `).join('');
                    achievementsContent.innerHTML = achievementsHTML;
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
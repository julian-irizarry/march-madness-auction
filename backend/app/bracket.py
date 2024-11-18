import csv

import requests


def get_teams(year: int, month: str, days: tuple[str, str]) -> list[list[str]]:
    """
    Generate Team Name, Seed, and Region. Uses an api indexing the dates of the first rounds of 64 to fill csv.

    :param year: The tournament year.
    :type year: int
    :param month: The month format like '03' for March.
    :type month: string
    :param month: The days of the first two games ie (21,22).
    :type month: tuple(string, string)
    :return: list of list containing name, seedn, region
    :rtype: list[list[str]]
    """

    teams = []
    for day in days:
        url: str = f"https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/{year}/{month}/{day}/scoreboard.json"
        response = requests.get(url, verify=False)

        if response.status_code == 200:
            data = response.json()

            for game in data.get("games", []):  # Adjust the path based on the actual data structure
                away_team = game.get("game").get("away")
                home_team = game.get("game").get("home")
                region = game.get("game").get("bracketRegion")

                teams.append([away_team.get("names").get("short"), away_team.get("seed"), region])
                teams.append([home_team.get("names").get("short"), home_team.get("seed"), region])
        else:
            print(f"ERROR READING URL: {url}: {response.status_code}")
    return teams


def generate_bracket_csv(year: int, month: str, days: tuple[str, str]):
    """
    Generate a CSV of Team Name, Seed, and Region. Uses an api indexing the dates of the first rounds of 64 to fill csv.

    :param year: The tournament year.
    :type year: int
    :param month: The month format like '03' for March.
    :type month: string
    :param month: The days of the first two games ie (21,22).
    :type month: tuple(string, string)
    """

    with open("march_madness_teams.csv", mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["Team Name", "Seed", "Region"])

        for day in days:
            url: str = (
                f"https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/{year}/{month}/{day}/scoreboard.json"
            )
            response = requests.get(url)

            if response.status_code == 200:
                data = response.json()

                for game in data.get("games", []):  # Adjust the path based on the actual data structure
                    away_team = game.get("game").get("away")
                    home_team = game.get("game").get("home")
                    region = game.get("game").get("bracketRegion")

                    writer.writerow([away_team.get("names").get("short"), away_team.get("seed"), region])
                    writer.writerow([home_team.get("names").get("short"), home_team.get("seed"), region])
            else:
                print(f"ERROR READING URL: {url}: {response.status_code}")


if __name__ == "__main__":
    generate_bracket_csv(year=2024, month="03", days=("21", "22"))

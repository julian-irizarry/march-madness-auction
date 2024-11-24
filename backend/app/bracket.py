import csv

import requests
from app.types.types import MatchInfo, TeamInfo


def get_teams(year: int, month: str, days: tuple[str, str]) -> list[TeamInfo]:
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

    teams: dict[str, TeamInfo] = {}
    for day in days:
        url: str = f"https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/{year}/{month}/{day}/scoreboard.json"
        response = requests.get(url, verify=False)

        if response.status_code == 200:
            data = response.json()

            for game in data.get("games", []):  # Adjust the path based on the actual data structure
                away_team = game.get("game").get("away")
                home_team = game.get("game").get("home")
                region = game.get("game").get("bracketRegion")

                away_team_info = TeamInfo(
                    shortName=away_team.get("names").get("short"),
                    urlName=away_team.get("names").get("seo"),
                    seed=away_team.get("seed"),
                    region=region,
                )
                home_team_info = TeamInfo(
                    shortName=home_team.get("names").get("short"),
                    urlName=home_team.get("names").get("seo"),
                    seed=home_team.get("seed"),
                    region=region,
                )
                teams[away_team_info.shortName] = away_team_info
                teams[home_team_info.shortName] = home_team_info
        else:
            print(f"ERROR READING URL: {url}: {response.status_code}")
    return list(teams.values())


def get_matches(year: int, month: str, days: tuple[str, str]) -> list[MatchInfo]:
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

    matches: list[MatchInfo] = []
    id = 0
    for day in days:
        url: str = f"https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/{year}/{month}/{day}/scoreboard.json"
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            for game in data.get("games", []):  # Adjust the path based on the actual data structure
                away_team = game.get("game").get("away")
                home_team = game.get("game").get("home")
                region = game.get("game").get("bracketRegion")
                start_date = game.get("game").get("startDate")
                bracket_round = game.get("game").get("bracketRound")

                away_team_info = TeamInfo(
                    shortName=away_team.get("names").get("short"),
                    urlName=away_team.get("names").get("seo"),
                    seed=away_team.get("seed"),
                    region=region,
                )
                home_team_info = TeamInfo(
                    shortName=home_team.get("names").get("short"),
                    urlName=home_team.get("names").get("seo"),
                    seed=home_team.get("seed"),
                    region=region,
                )
                winner_name = away_team_info.shortName if away_team.get("winner") else home_team_info.shortName

                matches.append(
                    MatchInfo(
                        id=id,
                        nextMatchId=-1,
                        roundName=bracket_round,
                        participants=[away_team_info, home_team_info],
                        winner=winner_name,
                        startDate=start_date,
                    )
                )
        else:
            print(f"ERROR READING URL: {url}: {response.status_code}")
    return matches


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

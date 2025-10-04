#!/usr/bin/env python3
"""
Analyze the expanded movies dataset
"""
import pandas as pd

def analyze_expanded_movies():
    """Analyze the newly generated movies"""
    try:
        # Read the expanded dataset
        df = pd.read_csv('expanded_movies.csv')
        
        print('🎬 DATA EXPANSION RESULTS')
        print('=' * 60)
        
        # Filter to show only the new movies (after row 20)
        original_count = 20
        new_movies = df[original_count:].copy()
        
        # Remove fallback entries that failed to parse
        new_movies_clean = new_movies[~new_movies['title'].str.contains('generated_')]
        
        print(f'📊 Expansion Summary:')
        print(f'  • Original movies: {original_count}')
        print(f'  • Total after expansion: {len(df)}')
        print(f'  • Successfully generated: {len(new_movies_clean)}')
        print(f'  • Failed generations (fallback): {len(new_movies) - len(new_movies_clean)}')
        print()
        
        if len(new_movies_clean) > 0:
            print('🎭 AI-Generated Movies from 2020s:')
            print('-' * 60)
            
            for i, (_, movie) in enumerate(new_movies_clean.iterrows(), 1):
                try:
                    budget = float(movie['budget_millions'])
                    box_office = float(movie['box_office_millions'])
                    profit_ratio = box_office / budget if budget > 0 else 0
                    
                    print(f'{i:2d}. {movie["title"]}')
                    print(f'    📅 {movie["year"]} | 🎬 {movie["director"]}')
                    print(f'    🎪 {movie["genre"]} | ⭐ {movie["rating"]}/10')
                    print(f'    💰 ${budget}M → 🎫 ${box_office}M (📈 {profit_ratio:.1f}x)')
                    print()
                except (ValueError, TypeError):
                    print(f'{i:2d}. {movie["title"]} (data parsing error)')
                    print()
        
        # Show some statistics
        if len(new_movies_clean) > 0:
            print('📈 Generation Statistics:')
            print('-' * 30)
            years = new_movies_clean['year'].tolist()
            genres = new_movies_clean['genre'].tolist()
            directors = new_movies_clean['director'].tolist()
            
            # Count unique values
            unique_years = set(str(y) for y in years if str(y) != 'nan')
            unique_genres = set(str(g) for g in genres if str(g) != 'nan')
            unique_directors = set(str(d) for d in directors if str(d) != 'nan')
            
            print(f'  • Years represented: {", ".join(sorted(unique_years))}')
            print(f'  • Genres: {", ".join(unique_genres)}')
            print(f'  • Directors: {", ".join(unique_directors)}')
        
        return True
        
    except FileNotFoundError:
        print('❌ File expanded_movies.csv not found. Please run the expansion first.')
        return False
    except Exception as e:
        print(f'❌ Error analyzing data: {e}')
        return False

if __name__ == "__main__":
    analyze_expanded_movies()
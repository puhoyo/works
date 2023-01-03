#include <iostream>
#include <vector>
#include <list>
#include <algorithm>

int total = 0;
enum {up = 1, down, left, right, kValueInsert, kCountInsert, kDone };
const int kMaxN = 49;
const int kMinN = 3;
const int kMaxM = 100;
const int kMinM = 1;
const int kMaxMarble = 3;
const int kMinMarble = 0;
int input[kMaxN][kMaxN];
std::list<int> maps[2];
std::list<int>::iterator deletors[kMaxN];
int range[kMaxM][2];
int N = 0;
int M = 0;
int cur_map = 0;
std::list<int>* map = &maps[cur_map];
void PrintInput() {
    for(const auto& r: input) {
        for(const auto c: r) {
            std::cout << c << " ";
        }
        puts("");
    }
}
void PrintMap() {
    for(const auto e: *map) {
        std::cout << e << " ";
    }
    puts("");
}
void SwitchMap() {
    if(cur_map == 0) cur_map = 1;
    else cur_map = 0;
    map = &maps[cur_map];
}
void GetNextTarget(std::list<int>::iterator& iter, int step, int direction) {
    switch(direction) {
        case up:
            std::advance(iter, (8 * step + 7));
            break;
        case down:
            std::advance(iter, (8 * step + 3));
            break;
        case left:
            std::advance(iter, (8 * step + 1));
            break;
        case right:
            std::advance(iter, (8 * step + 5));
            break;
    }
}
const std::list<int>::iterator InitMapSize(std::list<int>::iterator first_zero_iter) {
    const int insert_count = N * N - map->size();
    auto ret = --first_zero_iter;
    for(int i = 0; i < insert_count; i++) {
        map->push_back(0);
    }
    return ++ret;
}
int main() {
    std::cin >> N >> M;

    if(N < kMinN || N > kMaxN) {
        std::cout << kMinN << " <= N <= " << kMaxN << std::endl;
        return 0;
    }
    if(N % 2 == 0) {
        std::cout << "N must be an odd number" << std::endl;
        return 0;
    }

    if(M < kMinM || M > kMaxM) {
        std::cout << kMinM << " <= M <= " << kMaxM << std::endl;
        return 0;
    }

    //PrintInput();

    for(int i = 0; i < N; i++) {
        for(int k = 0; k < N; k++) {
            std::cin >> input[i][k];
            if(input[i][k] < kMinMarble || input[i][k] > kMaxMarble) {
                std::cout << kMinMarble << " <= input <= " << kMaxMarble << std::endl;
                return 0;
            }
        }
    }

    int r = N / 2;
    int c = r;
    if(input[r][c] != 0) {
        std::cout << "input of shark position must be 0" << std::endl;
        return 0;
    }
    map->push_back(input[r][c]);

    int direction = left;
    int current_step = 1;
    int i = 0;
    while(true) {
        i++;
        switch (direction) {
        case up:
            r--;
            if(i == current_step) {
                direction = left;
                i = 0;
                current_step++;
            }
            break;
        case down:
            r++;
            if(i == current_step) {
                direction = right;
                i = 0;
                current_step++;
            }
            break;
        case left:
            c--;
            if(i == current_step) {
                direction = down;
                i = 0;
            }
            break;
        case right:
            c++;
            if(i == current_step) {
                direction = up;
                i = 0;
            }
            break;
        }

        map->push_back(input[r][c]);
        if(r == 0 && c == 0) break;
    }

    PrintMap();

    {
        auto first_zero_iter = std::find(++map->begin(), map->end(), 0);
        if(first_zero_iter != map->end()) {
            first_zero_iter++;
            if(std::find_if(first_zero_iter, map->end(), [](auto e) { return e != 0; }) != map->end()) {
                std::cout << "invalid input(s) of 0" << std::endl;
                return 0;
            };
        }
    }

    {
        auto iter = ++map->begin();
        auto first_zero_iter = std::find(iter, map->end(), 0);
        int val = *iter;
        int cnt = 0;
        while(iter != first_zero_iter) {
            if(*iter == val) {
                if(++cnt > 3) {
                    std::cout << "invalid inputs of serials" << std::endl;
                    return 0;
                }
            }
            else {
                val = *iter;
                cnt = 1;
            }
            iter++;
        }
    }


    for(int i = 0; i < M; i++) {
        std::cin >> range[i][0] >> range[i][1];
    }
    for(int i = 0; i < M; i++) {
        if(range[i][0] < up || range[i][0] > right) {
            std::cout << up << " <= casting direction <= " << right << std::endl;
            return 0;
        }
        if(range[i][1] < 1 || range[i][1] > (N-1)/2) {
            std::cout << "1 <= casting distance <= " << (N-1)/2 << std::endl;
            return 0;
        }
    }

    for(int i = 0; i < M; i++) {
        std::cout << "cast " << i+1 << ": [" << range[i][0] << "," << range[i][1] << "]" << std::endl;
    }

    // init secondary map
    for(auto iter = map->begin(); iter != map->end(); iter++) {
        maps[1].push_back(0);
    }

    const auto shark_position = map->begin();
    for(int i = 0; i < M; i++) {
        auto iter = map->begin();
        const auto first_zero_iter = std::find(++map->begin(), map->end(), 0);
        //step 1: cast blizzard
        //삭제 수 만큼 반복
        std::cout << "cast blizzard " << i+1 << std::endl;
        int blizzard_hit_count = 0;
        for(int k = 0; k < range[i][1]; k++) {
            //삭제 타겟 잡음
            GetNextTarget(iter, k, range[i][0]);
            if(*iter > 0) {
                //iter가 정상적인 값이면 (1, 2, 3) blizzard_hit_count++ 하면서 삭제 타겟에 추가
                std::cout << "target " << k << ": " << *iter << std::endl;
                deletors[k] = iter;
                blizzard_hit_count++;
            }
        }
        for(int k = 0; k < blizzard_hit_count; k++) {
            //삭제함
            deletors[k] = map->erase(deletors[k]);
        }
        std::cout << "after cast" << std::endl;
        PrintMap();

        //step 2: burst
        int bursted_count = blizzard_hit_count;
        while(bursted_count > 0) {
            const int iteration = bursted_count;
            bursted_count = 0;
            for(int k = 0; k < iteration; k++) {
                if(*deletors[k] != 0) {
                    //deletors[k] 기준으로 앞으로 2개, 뒤로 3개 검색하면서 같은 값이면 카운트 증가 (fisrt_zero 또는 shark_position이면 검색 중단)
                    int target_value = *deletors[k];
                    int cnt = 1;
                    //앞부터
                    auto forward_deletor = deletors[k];
                    for(int f = 0; f < 3; f++) {
                        forward_deletor++;
                        if(forward_deletor == first_zero_iter) {
                            break;
                        }

                        if(*forward_deletor == target_value) {
                            cnt++;
                        }
                        else break;
                    }
                    auto backward_deletor = deletors[k];
                    for(int f = 0; f < 3; f++) {
                        backward_deletor--;
                        if(backward_deletor == shark_position) {
                            backward_deletor++;
                            break;
                        }

                        if(*backward_deletor == target_value) {
                            cnt++;
                        }
                        else {
                            backward_deletor++;
                            break;
                        }
                    }

                    if(cnt > 3) {
                        total += cnt * target_value;
                        deletors[bursted_count++] = map->erase(backward_deletor, forward_deletor);
                    }
                }
                std::cout << "after burst " << k << std::endl;
                PrintMap();
            }
            std::cout << "bursted_count: " << bursted_count << std::endl;
        }

        if(i == M-1) {
            //마지막 폭발 스텝이 끝났으므로 종료
            std::cout << "answer: " << total  << std::endl;
        }
        else {
            //step 3: multiplication
            
            const auto search_end_iter = InitMapSize(first_zero_iter);
            auto search_iter = ++map->begin();
            int insert_flag = search_iter == search_end_iter ? kDone : kCountInsert;
            SwitchMap();

            int inserted_count = 0;
            int current_value = 0;
            int current_value_count = 1;

            std::cout << "map before start insertion" << std::endl;
            PrintMap();
            for(auto insert_iter = ++map->begin(); insert_iter != map->end(); insert_iter++) {
                if(insert_flag == kCountInsert) {
                    // original map 에서 value 구한 뒤 insert
                    current_value = *search_iter;
                    current_value_count = 1;
                    while(true) {
                        search_iter++;
                        if(search_iter == search_end_iter) {
                            break;
                        }
                        else if(current_value != *search_iter) {
                            break;
                        }
                        else {
                            current_value_count++;
                        }
                    }

                    insert_flag = kValueInsert;
                    *insert_iter = current_value_count;
                }
                else if(insert_flag == kValueInsert) {
                    // value_insert에서 구한 count값을 insert
                    *insert_iter = current_value;
                    if(search_iter == search_end_iter) insert_flag = kDone;
                    else insert_flag = kCountInsert;
                }
                else {
                    //0으로 초기화
                    *insert_iter = 0;
                }
            }

            std::cout << "after multiplication" << std::endl;
            PrintMap();
        }
    }

    return 0;
}

#include "include/user.hpp"
#include "../../server/include/packet.hpp"
#include "../apis/include/packet_handler_base.hpp"
#include "../application.hpp"
#include "../../server/include/socket.hpp"
#include <random>
using namespace std::chrono_literals;

namespace IocpGameServer {

	void User::Init() {
	}

	void User::ForceDisconnect() {
		std::scoped_lock lock(send_lock_);
		force_disconnected_ = true;

		puts("disconnect done");
	}

	void User::Send(const unsigned int protocol, const std::string& data) {
		if (auto p = socket_.lock()) {
			p->Send(protocol, data);
		}
	}
	void User::Send(const unsigned int protocol) {
		if (auto p = socket_.lock()) {
			p->Send(protocol);
		}
	}

	const bool User::CreateUser(std::shared_ptr<Socket> socket, std::string data) {
		auto user = socket->GetUser();
		if (user == nullptr) {
			// access token 또는 ID/PWD 등으로 인증
			// 인증 완료했다고 가정

			// data == user_name (임시)
			const auto& user_name = data;

			// 유저 아이디 생성 (임시)
			std::random_device rd;
			std::mt19937 generator(rd());
			std::uniform_int_distribution distribution;
			const auto user_id = distribution(generator);

			user.reset(new User(socket, socket->GetApp(), user_id, user_name));
			socket->SetUser(user);

			return true;
		}
		else return false;
	}

} //namespace IocpGameServer